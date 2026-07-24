import { prisma } from "@/lib/prisma";
import { sendEmail } from "@dub/email";
import ProgramImported from "@dub/email/templates/program-imported";
import { chunk, nanoid } from "@dub/utils";
import {
  CommissionStatus,
  Customer,
  Link,
  Program,
  Reward,
} from "@prisma/client";
import { convertCurrencyWithFxRates } from "../analytics/convert-currency";
import { isFirstConversion } from "../analytics/is-first-conversion";
import { createId } from "../api/create-id";
import { updateLinkStatsForImporter } from "../api/links/update-link-stats-for-importer";
import { syncPartnerLinksStats } from "../api/partners/sync-partner-links-stats";
import { syncTotalCommissions } from "../api/partners/sync-total-commissions";
import { calculateSaleEarnings } from "../api/sales/calculate-sale-earnings";
import { getLeadEvents } from "../tinybird/get-lead-events";
import { logImportError } from "../tinybird/log-import-error";
import { recordSaleWithTimestamp } from "../tinybird/record-sale";
import { LeadEventTB } from "../types";
import { redis } from "../upstash";
import { clickEventSchemaTB } from "../zod/schemas/clicks";
import { LemonSqueezyApi } from "./api";
import { LEMONSQUEEZY_MAX_BATCHES, lemonSqueezyImporter } from "./importer";
import {
  LemonSqueezyImportPayload,
  LemonSqueezyOrder,
  LemonSqueezySubscriptionInvoice,
} from "./types";

type SaleEvent = {
  invoiceId: string;
  affiliateId: string;
  customerExternalId: string;
  amount: number;
  currency: string;
  amountUsd: number | null | undefined;
  status: string;
  createdAt: string;
  metadata: Record<string, unknown>;
};

// Only renewals/updates — initials are covered by the Order import.
// Missing/unknown billing_reason is skipped to avoid double-counting.
const IMPORTABLE_INVOICE_REASONS = new Set(["renewal", "updated"]);

const toDubStatus = (status: string): CommissionStatus | null => {
  switch (status) {
    case "paid":
      return "paid";
    case "pending":
      return "pending";
    case "refunded":
    case "partial_refund":
      return "canceled";
    case "void":
    case "failed":
    case "fraudulent":
      return null; // skip
    default:
      return "pending";
  }
};

export async function importCommissions(payload: LemonSqueezyImportPayload) {
  const {
    importId,
    programId,
    storeId,
    userId,
    page = 1,
    resource = "orders",
  } = payload;

  const program = await prisma.program.findUnique({
    where: {
      id: programId,
    },
  });

  if (!program) {
    console.error(`Program ${programId} not found.`);
    return;
  }

  if (!program.domain) {
    console.error("Program domain not found", program.id);
    return;
  }

  const { apiKey } = await lemonSqueezyImporter.getCredentials(
    program.workspaceId,
  );
  const lemonSqueezyApi = new LemonSqueezyApi({ apiKey });

  const fxRates = await redis.hgetall<Record<string, string>>("fxRates:usd");

  let currentPage = page;
  let hasMore = true;
  let processedBatches = 0;

  while (hasMore && processedBatches < LEMONSQUEEZY_MAX_BATCHES) {
    const { saleEvents, pageEmpty } =
      resource === "orders"
        ? await listOrderSaleEvents({
            lemonSqueezyApi,
            storeId,
            page: currentPage,
          })
        : await listInvoiceSaleEvents({
            lemonSqueezyApi,
            storeId,
            page: currentPage,
          });

    if (pageEmpty) {
      hasMore = false;
      break;
    }

    if (saleEvents.length > 0) {
      await processSaleEvents({
        program,
        domain: program.domain,
        saleEvents,
        fxRates,
        importId,
      });
    }

    currentPage++;
    processedBatches++;
  }

  if (hasMore) {
    await lemonSqueezyImporter.queue({
      ...payload,
      action: "import-commissions",
      resource,
      page: currentPage,
    });
    return;
  }

  // Finished orders → continue with subscription invoices (skip initial to avoid double-count)
  if (resource === "orders") {
    await lemonSqueezyImporter.queue({
      ...payload,
      action: "import-commissions",
      resource: "subscription-invoices",
      page: 1,
    });
    return;
  }

  // Imports finished
  await lemonSqueezyImporter.deleteCredentials(program.workspaceId);

  const workspaceUser = await prisma.projectUsers.findUnique({
    where: {
      userId_projectId: {
        userId,
        projectId: program.workspaceId,
      },
    },
    include: {
      project: true,
      user: true,
    },
  });

  if (workspaceUser?.user.email) {
    await sendEmail({
      to: workspaceUser.user.email,
      subject: "Lemon Squeezy program imported",
      react: ProgramImported({
        email: workspaceUser.user.email,
        workspace: workspaceUser.project,
        program,
        provider: "Lemon Squeezy",
        importId,
      }),
    });
  }
}

async function listOrderSaleEvents({
  lemonSqueezyApi,
  storeId,
  page,
}: {
  lemonSqueezyApi: LemonSqueezyApi;
  storeId: string;
  page: number;
}): Promise<{ saleEvents: SaleEvent[]; pageEmpty: boolean }> {
  const orders = await lemonSqueezyApi.listOrders({ storeId, page });

  if (orders.length === 0) {
    return { saleEvents: [], pageEmpty: true };
  }

  const saleEvents = orders
    .filter((order): order is LemonSqueezyOrder & { affiliate_id: number } =>
      Boolean(order.affiliate_id),
    )
    .map((order) => ({
      invoiceId: `ls_order_${order.id}`,
      affiliateId: String(order.affiliate_id),
      customerExternalId: String(order.customer_id),
      amount: order.subtotal,
      currency: order.currency,
      amountUsd: order.subtotal_usd,
      status: order.status,
      createdAt: order.created_at || new Date().toISOString(),
      metadata: order as unknown as Record<string, unknown>,
    }));

  return { saleEvents, pageEmpty: false };
}

async function listInvoiceSaleEvents({
  lemonSqueezyApi,
  storeId,
  page,
}: {
  lemonSqueezyApi: LemonSqueezyApi;
  storeId: string;
  page: number;
}): Promise<{ saleEvents: SaleEvent[]; pageEmpty: boolean }> {
  const invoices = await lemonSqueezyApi.listSubscriptionInvoices({
    storeId,
    page,
  });

  if (invoices.length === 0) {
    return { saleEvents: [], pageEmpty: true };
  }

  const saleEvents = invoices
    .filter(
      (
        invoice,
      ): invoice is LemonSqueezySubscriptionInvoice & {
        affiliate_id: number;
      } =>
        Boolean(invoice.affiliate_id) &&
        Boolean(
          invoice.billing_reason &&
            IMPORTABLE_INVOICE_REASONS.has(invoice.billing_reason),
        ),
    )
    .map((invoice) => ({
      invoiceId: `ls_invoice_${invoice.id}`,
      affiliateId: String(invoice.affiliate_id),
      customerExternalId: String(invoice.customer_id),
      amount: invoice.subtotal,
      currency: invoice.currency,
      amountUsd: invoice.subtotal_usd,
      status: invoice.status,
      createdAt: invoice.created_at || new Date().toISOString(),
      metadata: invoice as unknown as Record<string, unknown>,
    }));

  return { saleEvents, pageEmpty: false };
}

async function processSaleEvents({
  program,
  domain,
  saleEvents,
  fxRates,
  importId,
}: {
  program: Pick<Program, "id" | "workspaceId">;
  domain: string;
  saleEvents: SaleEvent[];
  fxRates: Record<string, string> | null;
  importId: string;
}) {
  const affiliateIds = [
    ...new Set(saleEvents.map((event) => event.affiliateId)),
  ];
  const customerExternalIds = [
    ...new Set(saleEvents.map((event) => event.customerExternalId)),
  ];

  const [links, customersData] = await Promise.all([
    prisma.link.findMany({
      where: {
        domain,
        key: {
          in: affiliateIds,
        },
      },
    }),
    prisma.customer.findMany({
      where: {
        projectId: program.workspaceId,
        externalId: {
          in: customerExternalIds,
        },
      },
      include: {
        link: true,
      },
      orderBy: {
        createdAt: "asc",
      },
    }),
  ]);

  const affiliateIdToLink = new Map(links.map((link) => [link.key, link]));

  const partnerIds = [
    ...new Set(
      links
        .map((link) => link.partnerId)
        .filter((id): id is string => Boolean(id)),
    ),
  ];

  const enrollments = await prisma.programEnrollment.findMany({
    where: {
      programId: program.id,
      partnerId: {
        in: partnerIds,
      },
    },
    include: {
      saleReward: true,
    },
  });

  const partnerIdToSaleReward = new Map(
    enrollments.map((enrollment) => [
      enrollment.partnerId,
      enrollment.saleReward,
    ]),
  );

  const customerLeadEvents = await getLeadEvents({
    customerIds: customersData.map((customer) => customer.id),
  }).then((res) => res.data);

  const saleChunks = chunk(saleEvents, 10);

  for (const saleChunk of saleChunks) {
    await Promise.all(
      saleChunk.map((saleEvent) =>
        createCommission({
          program,
          saleEvent,
          partnerLink: affiliateIdToLink.get(saleEvent.affiliateId),
          saleReward: (() => {
            const partnerId = affiliateIdToLink.get(
              saleEvent.affiliateId,
            )?.partnerId;
            return partnerId
              ? partnerIdToSaleReward.get(partnerId) ?? null
              : null;
          })(),
          fxRates,
          importId,
          customersData,
          customerLeadEvents,
        }),
      ),
    );
  }
}

async function createCommission({
  program,
  saleEvent,
  partnerLink,
  saleReward,
  fxRates,
  importId,
  customersData,
  customerLeadEvents,
}: {
  program: Pick<Program, "id" | "workspaceId">;
  saleEvent: SaleEvent;
  partnerLink?: Link;
  saleReward: Reward | null;
  fxRates: Record<string, string> | null;
  importId: string;
  customersData: (Customer & { link: Link | null })[];
  customerLeadEvents: LeadEventTB[];
}) {
  const commonImportLogInputs = {
    workspace_id: program.workspaceId,
    import_id: importId,
    source: "lemonsqueezy" as const,
    entity: "commission" as const,
    entity_id: saleEvent.invoiceId,
  };

  const status = toDubStatus(saleEvent.status);
  if (!status) {
    return;
  }

  const existingCommission = await prisma.commission.findUnique({
    where: {
      invoiceId_programId: {
        invoiceId: saleEvent.invoiceId,
        programId: program.id,
      },
    },
    select: {
      id: true,
    },
  });

  if (existingCommission) {
    console.log(
      `Commission ${saleEvent.invoiceId} already exists, skipping...`,
    );
    return;
  }

  if (!partnerLink?.partnerId) {
    await logImportError({
      ...commonImportLogInputs,
      code: "PARTNER_NOT_FOUND",
      message: `No imported partner found for affiliate ${saleEvent.affiliateId} (commission ${saleEvent.invoiceId}).`,
    });
    return;
  }

  const existingCustomer = customersData.find(
    ({ externalId }) => externalId === saleEvent.customerExternalId,
  );

  if (!existingCustomer) {
    await logImportError({
      ...commonImportLogInputs,
      code: "CUSTOMER_NOT_FOUND",
      message: `No customer ${saleEvent.customerExternalId} found for commission ${saleEvent.invoiceId}.`,
    });
    return;
  }

  if (!existingCustomer.clickId) {
    await logImportError({
      ...commonImportLogInputs,
      code: "CLICK_NOT_FOUND",
      message: `No click found for customer ${existingCustomer.id}.`,
    });
    return;
  }

  const leadEvent = customerLeadEvents.find(
    (event) => event.customer_id === existingCustomer.id,
  );

  if (!leadEvent) {
    await logImportError({
      ...commonImportLogInputs,
      code: "LEAD_NOT_FOUND",
      message: `No lead event found for customer ${existingCustomer.id}.`,
    });
    return;
  }

  // Prefer LS-provided USD amounts; otherwise convert
  let saleAmount: number | null =
    saleEvent.amountUsd != null
      ? saleEvent.amountUsd
      : saleEvent.currency.toUpperCase() === "USD"
        ? saleEvent.amount
        : null;

  if (saleAmount == null && fxRates) {
    const converted = convertCurrencyWithFxRates({
      currency: saleEvent.currency,
      amount: saleEvent.amount,
      fxRates,
    });
    saleAmount =
      converted.currency.toUpperCase() === "USD" ? converted.amount : null;
  }

  if (saleAmount == null) {
    await logImportError({
      ...commonImportLogInputs,
      code: "NOT_SUPPORTED_UNIT",
      message: `Commission ${saleEvent.invoiceId} skipped: no USD amount and FX rate unavailable for currency ${saleEvent.currency}.`,
    });
    return;
  }

  const createdAt = new Date(saleEvent.createdAt);

  // LS does not expose per-order commission amounts; derive from Dub sale reward
  const earnings = saleReward
    ? calculateSaleEarnings({
        reward: {
          type: saleReward.type,
          amountInCents: saleReward.amountInCents,
          amountInPercentage: saleReward.amountInPercentage
            ? Number(saleReward.amountInPercentage)
            : null,
        },
        sale: {
          amount: saleAmount,
          quantity: 1,
        },
      })
    : 0;

  const clickData = clickEventSchemaTB
    .omit({ timestamp: true })
    .parse(leadEvent);

  const eventId = nanoid(16);

  await Promise.all([
    prisma.commission.create({
      data: {
        id: createId({ prefix: "cm_" }),
        eventId,
        type: "sale",
        programId: program.id,
        partnerId: partnerLink.partnerId,
        linkId: partnerLink.id,
        customerId: existingCustomer.id,
        amount: saleAmount,
        earnings,
        currency: "usd",
        quantity: 1,
        status,
        invoiceId: saleEvent.invoiceId,
        createdAt,
      },
    }),

    saleAmount > 0 &&
      recordSaleWithTimestamp({
        ...clickData,
        link_id: partnerLink.id,
        domain: partnerLink.domain,
        key: partnerLink.key,
        url: partnerLink.url,
        event_id: eventId,
        event_name: "Invoice paid",
        amount: saleAmount,
        customer_id: existingCustomer.id,
        payment_processor: "lemonsqueezy",
        currency: "usd",
        metadata: JSON.stringify(saleEvent.metadata),
        timestamp: createdAt.toISOString(),
      }),

    prisma.link.update({
      where: {
        id: partnerLink.id,
      },
      data: {
        ...(isFirstConversion({
          customer: existingCustomer,
          linkId: partnerLink.id,
        }) && {
          conversions: {
            increment: 1,
          },
          lastConversionAt: updateLinkStatsForImporter({
            currentTimestamp: partnerLink.lastConversionAt,
            newTimestamp: createdAt,
          }),
        }),
        ...(saleAmount > 0 && {
          sales: {
            increment: 1,
          },
          saleAmount: {
            increment: saleAmount,
          },
        }),
      },
    }),

    syncPartnerLinksStats({
      partnerId: partnerLink.partnerId,
      programId: program.id,
      eventType: "sale",
    }),

    saleAmount > 0 &&
      prisma.customer.update({
        where: {
          id: existingCustomer.id,
        },
        data: {
          sales: {
            increment: 1,
          },
          saleAmount: {
            increment: saleAmount,
          },
          firstSaleAt: existingCustomer.firstSaleAt ? undefined : createdAt,
        },
      }),
  ]);

  await syncTotalCommissions({
    partnerId: partnerLink.partnerId,
    programId: program.id,
  });
}
