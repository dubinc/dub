import { isFirstConversion } from "@/lib/analytics/is-first-conversion";
import { Session } from "@/lib/auth";
import { generateRandomName } from "@/lib/names";
import { queuePartnerCommissionCreation } from "@/lib/partners/queue-partner-commission-creation";
import { prisma } from "@/lib/prisma";
import { isStored, storage } from "@/lib/storage";
import {
  recordClickZod,
  recordClickZodSchema,
} from "@/lib/tinybird/record-click-zod";
import { recordLeadWithTimestamp } from "@/lib/tinybird/record-lead";
import { recordSaleWithTimestamp } from "@/lib/tinybird/record-sale";
import { CreatePartnerCommissionProps } from "@/lib/types";
import { createManualCommissionBodySchema } from "@/lib/zod/schemas/commissions";
import { leadEventSchemaTB } from "@/lib/zod/schemas/leads";
import { saleEventSchemaTB } from "@/lib/zod/schemas/sales";
import { COUNTRIES_TO_CONTINENTS, nanoid, R2_URL } from "@dub/utils";
import {
  CommissionType,
  Customer,
  Link,
  Partner,
  Project,
} from "@prisma/client";
import { waitUntil } from "@vercel/functions";
import * as z from "zod/v4";
import { createId } from "../create-id";
import { getCustomerStripeInvoices } from "../customers/get-customer-stripe-invoices";
import { DubApiError } from "../errors";
import { updateLinkStatsForImporter } from "../links/update-link-stats-for-importer";
import { syncPartnerLinksStats } from "../partners/sync-partner-links-stats";
import { getProgramEnrollmentOrThrow } from "../programs/get-program-enrollment-or-throw";
import { executeWorkflows } from "../workflows/execute-workflows";

type CreateCommissionsArgs = z.infer<
  typeof createManualCommissionBodySchema
> & {
  workspace: Pick<Project, "id" | "slug" | "stripeConnectId">;
  programId: string;
  user: Session["user"];
};

type ResolveLinkAndCustomerArgs = CreateCommissionsArgs & {
  workspace: Pick<Project, "id" | "stripeConnectId">;
  partner: Pick<Partner, "id" | "email">;
  links: Link[];
};

type RecordEventsArgs = CreateCommissionsArgs & {
  workspace: Pick<Project, "id" | "stripeConnectId">;
  partner: Pick<Partner, "id" | "email">;
  targetLink: Link;
  targetCustomer: Customer;
};

type ExecuteSideEffectsArgs = CreateCommissionsArgs & {
  clickEvent: { id: string; timestamp: string };
  leadEvent: { id: string; timestamp: string };
  saleEvents: Pick<
    z.infer<typeof saleEventSchemaTBWithTimestamp>,
    "timestamp" | "amount"
  >[];
  targetLink: Link;
  targetCustomer: Customer;
  isFirstConversion?: boolean;
};

const leadEventSchemaTBWithTimestamp = leadEventSchemaTB.extend({
  timestamp: z.string(),
});

const saleEventSchemaTBWithTimestamp = saleEventSchemaTB.extend({
  timestamp: z.string(),
});

export async function createManualCommissions(args: CreateCommissionsArgs) {
  const { workspace, programId, partnerId, type, user } = args;

  const { partner, links } = await getProgramEnrollmentOrThrow({
    programId,
    partnerId,
    include: {
      partner: true,
      links: true,
    },
  });

  // Custom commission
  if (type === "custom") {
    const { amount, date, description, user } = args;

    await queuePartnerCommissionCreation({
      event: "custom",
      programId,
      partnerId,
      amount,
      quantity: 1,
      createdAt: date ?? new Date(),
      description,
      userId: user.id,
      triggerAggregateDueCommissions: true,
    });

    return;
  }

  // Lead & sale commissions
  const { targetLink, targetCustomer, isFirstConversion } =
    await resolveLinkAndCustomer({
      ...args,
      links,
      partner,
    });

  if (type === "sale") {
    const {
      importStripeInvoices,
      saleAmount,
      saleEventDate,
      invoiceId,
      productId,
    } = args;

    if (!importStripeInvoices && !saleAmount) {
      throw new DubApiError({
        code: "bad_request",
        message: "Either saleAmount or importStripeInvoices must be provided.",
      });
    }

    const hasManualSaleFields =
      saleAmount || saleEventDate || invoiceId || productId;

    if (importStripeInvoices) {
      if (hasManualSaleFields) {
        throw new DubApiError({
          code: "bad_request",
          message:
            "saleAmount, saleEventDate, invoiceId, and productId cannot be provided when importStripeInvoices is enabled.",
        });
      }

      if (!workspace.stripeConnectId) {
        throw new DubApiError({
          code: "bad_request",
          message: `Your workspace isn't connected to Stripe yet. Please install the Stripe integration to continue: https://app.dub.co/${workspace.slug}/settings/integrations/stripe`,
        });
      }

      if (targetCustomer && !targetCustomer.stripeCustomerId) {
        throw new DubApiError({
          code: "bad_request",
          message: `Customer ${targetCustomer.id} does not have a Stripe Customer ID configured. Please update the customer record at https://app.dub.co/${workspace.slug}/program/customers/${targetCustomer.id}`,
        });
      }
    }

    if (invoiceId) {
      const commission = await prisma.commission.findUnique({
        where: {
          invoiceId_programId: {
            invoiceId,
            programId,
          },
        },
        select: {
          id: true,
        },
      });

      if (commission) {
        throw new DubApiError({
          code: "conflict",
          message: `There is already a commission for the invoice ${invoiceId}.`,
        });
      }
    }
  }

  const { clickEvent, leadEvent, saleEvents } = await recordEvents({
    ...args,
    partner,
    targetLink,
    targetCustomer,
  });

  const commissionsToCreate: CreatePartnerCommissionProps[] = [];

  // Lead commission
  if (type === CommissionType.lead) {
    commissionsToCreate.push({
      event: CommissionType.lead,
      programId,
      partnerId,
      linkId: targetLink.id,
      customerId: targetCustomer.id,
      eventId: leadEvent.id,
      quantity: 1,
      // we don't add the "Z" to the timestamp because it's already in UTC
      createdAt: new Date(leadEvent.timestamp),
      userId: user.id,
      context: {
        customer: {
          country: targetCustomer.country,
        },
      },
    });
  }

  // Sale commissions
  else if (type === CommissionType.sale) {
    commissionsToCreate.push(
      ...saleEvents.map((saleEvent) => ({
        event: CommissionType.sale,
        programId,
        partnerId,
        linkId: targetLink.id,
        customerId: targetCustomer.id,
        quantity: 1,
        eventId: saleEvent.id,
        amount: saleEvent.amount,
        currency: saleEvent.currency,
        invoiceId: saleEvent.invoiceId,
        createdAt: new Date(saleEvent.timestamp),
        // if the invoice payment was refunded on Stripe, set the commission status to refunded as well
        ...(saleEvent.status === "refunded" && {
          status: "refunded" as const,
        }),
        userId: user.id,
        context: {
          customer: {
            country: targetCustomer.country,
            signupDate: targetCustomer.createdAt,
          },
          sale: {
            productId: saleEvent.productId,
            amount: saleEvent.amount,
          },
        },
        isFirstConversion,
      })),
    );
  }

  for (const [index, commissionToCreate] of commissionsToCreate.entries()) {
    await queuePartnerCommissionCreation({
      ...commissionToCreate,
      triggerAggregateDueCommissions: index === commissionsToCreate.length - 1, // trigger the job once per batch
    });
  }

  waitUntil(
    executeSideEffects({
      ...args,
      targetLink,
      targetCustomer,
      clickEvent,
      leadEvent,
      saleEvents,
      isFirstConversion,
    }),
  );
}

async function resolveLinkAndCustomer(args: ResolveLinkAndCustomerArgs) {
  const { type } = args;

  // Just to make TypeScript happy
  if (type === "custom") {
    throw new Error("Error");
  }

  let targetLink: Link;
  let targetCustomer: Customer | null = null;
  const { workspace, partner, links, linkId, customerId, customer } = args;

  if (links.length === 0) {
    throw new DubApiError({
      code: "bad_request",
      message: `Partner ${partner.email} (${partner.id}) has no links.`,
    });
  }

  if (!customerId && !customer) {
    throw new DubApiError({
      code: "bad_request",
      message: "Either customerId or customer must be provided.",
    });
  }

  if (customerId && customer) {
    throw new DubApiError({
      code: "bad_request",
      message: "Either customerId or customer must be provided, not both.",
    });
  }

  if (linkId) {
    const link = links.find((l) => l.id === linkId);

    if (!link) {
      throw new DubApiError({
        code: "not_found",
        message: `Link ${linkId} does not belong to partner ${partner.email} (${partner.id}).`,
      });
    }

    targetLink = link;
  } else {
    // If linkId is not provided, default to the link with the most revenue
    targetLink = links.sort(
      (a, b) => Number(b.saleAmount) - Number(a.saleAmount),
    )[0];
  }

  // Find an existing customer
  if (customerId) {
    targetCustomer = await prisma.customer.findUnique({
      where: {
        id: customerId,
      },
    });

    if (!targetCustomer) {
      throw new DubApiError({
        code: "not_found",
        message: `Customer ${customerId} not found.`,
      });
    }

    if (targetCustomer.projectId !== workspace.id) {
      throw new DubApiError({
        code: "bad_request",
        message: `Customer ${customerId} does not belong to the workspace.`,
      });
    }
  }

  // Create or update the customer
  else if (customer) {
    const { name, email, avatar, country, externalId, stripeCustomerId } =
      customer;

    const customerId = createId({ prefix: "cus_" });
    const finalCustomerName = name || email || generateRandomName();
    const finalCustomerAvatar =
      avatar && !isStored(avatar)
        ? `${R2_URL}/customers/${customerId}/avatar_${nanoid(7)}`
        : avatar;

    targetCustomer = await prisma.customer.upsert({
      where: {
        projectId_externalId: {
          projectId: workspace.id,
          externalId,
        },
      },
      create: {
        id: customerId,
        name: finalCustomerName,
        email,
        avatar: finalCustomerAvatar,
        externalId,
        stripeCustomerId,
        linkId: targetLink.id,
        country,
        projectId: workspace.id,
        projectConnectId: workspace.stripeConnectId,
      },
      update: {
        name: finalCustomerName,
        email,
        avatar: finalCustomerAvatar,
        country,
        stripeCustomerId,
      },
    });

    if (avatar && !isStored(avatar) && finalCustomerAvatar) {
      await storage.upload({
        key: finalCustomerAvatar.replace(`${R2_URL}/`, ""),
        body: avatar,
        opts: {
          width: 128,
          height: 128,
        },
      });
    }
  }

  if (!targetCustomer) {
    throw new DubApiError({
      code: "bad_request",
      message: "Failed to resolve customer from the request.",
    });
  }

  return {
    targetLink,
    targetCustomer,
    ...(type === "sale" && {
      isFirstConversion: isFirstConversion({
        customer: targetCustomer,
        linkId: targetLink.id,
      }),
    }),
  };
}

async function recordEvents(args: RecordEventsArgs) {
  const { type } = args;

  // Just to make TypeScript happy
  if (type === "custom") {
    throw new Error("Error");
  }

  let finalLeadEventDate: Date;
  let stripeCustomerInvoices: Awaited<
    ReturnType<typeof getCustomerStripeInvoices>
  > = [];
  const { workspace, programId, targetLink, targetCustomer } = args;

  if (type === "lead") {
    finalLeadEventDate = args.leadEventDate ?? new Date();
  } else if (args.importStripeInvoices) {
    stripeCustomerInvoices = await getCustomerStripeInvoices({
      stripeCustomerId: targetCustomer.stripeCustomerId!,
      stripeConnectId: workspace.stripeConnectId!,
      programId,
    });

    // Filter out invoices that are already associated with a commission on Dub
    stripeCustomerInvoices = stripeCustomerInvoices.filter(
      (invoice) => !invoice.dubCommissionId,
    );

    if (stripeCustomerInvoices.length === 0) {
      throw new DubApiError({
        code: "bad_request",
        message: "No unimported Stripe invoices found for customer.",
      });
    }

    // Sort invoices by created date ascending
    stripeCustomerInvoices.sort(
      (a, b) => a.createdAt.getTime() - b.createdAt.getTime(),
    );

    finalLeadEventDate = stripeCustomerInvoices[0].createdAt;
  } else {
    finalLeadEventDate = args.saleEventDate ?? new Date();
  }

  const clickId = nanoid(16);
  const clickedAt = new Date(finalLeadEventDate.getTime() - 5 * 60 * 1000);
  const leadEventName = type === "lead" ? args.leadEventName : "Sign up";
  let saleEvents: z.infer<typeof saleEventSchemaTBWithTimestamp>[] = [];

  // Record click event
  const clickEvent = recordClickZodSchema.parse({
    timestamp: clickedAt.toISOString(),
    identity_hash: targetCustomer.externalId || targetCustomer.id,
    click_id: clickId,
    link_id: targetLink.id,
    url: targetLink.url,
    ip: "127.0.0.1",
    continent: targetCustomer.country
      ? COUNTRIES_TO_CONTINENTS[targetCustomer.country.toUpperCase()] || ""
      : "",
  });

  // Record lead event
  const leadEvent = leadEventSchemaTBWithTimestamp.parse({
    ...clickEvent,
    event_id: nanoid(16),
    event_name: leadEventName ?? "Sign up",
    customer_id: targetCustomer.id,
    timestamp: finalLeadEventDate.toISOString(),
  });

  // Record sale events
  if (type === "sale") {
    const {
      invoiceId,
      saleAmount,
      saleEventDate,
      productId,
      importStripeInvoices,
    } = args;

    if (importStripeInvoices) {
      saleEvents = stripeCustomerInvoices.map((invoice) =>
        saleEventSchemaTBWithTimestamp.parse({
          ...clickEvent,
          event_id: nanoid(16),
          invoice_id: invoice.id,
          event_name: "Invoice paid",
          amount: invoice.amount,
          customer_id: targetCustomer.id,
          payment_processor: "stripe",
          currency: "usd",
          timestamp: invoice.createdAt.toISOString(),
          metadata: JSON.stringify(invoice.metadata),
        }),
      );
    } else if (saleAmount) {
      saleEvents = [
        saleEventSchemaTBWithTimestamp.parse({
          ...clickEvent,
          event_id: nanoid(16),
          invoice_id: invoiceId ?? "",
          event_name: "Purchase",
          amount: saleAmount,
          customer_id: targetCustomer.id,
          payment_processor: "custom",
          currency: "usd",
          timestamp: new Date(saleEventDate ?? Date.now()).toISOString(),
          metadata: productId ? JSON.stringify({ productId }) : undefined,
        }),
      ];
    }
  }

  await Promise.all([
    recordClickZod(clickEvent),
    recordLeadWithTimestamp(leadEvent),
    saleEvents.length > 0 ? recordSaleWithTimestamp(saleEvents) : undefined,
  ]);

  return {
    clickEvent: {
      id: clickEvent.click_id,
      timestamp: clickEvent.timestamp,
    },
    leadEvent: {
      id: leadEvent.event_id,
      timestamp: leadEvent.timestamp,
    },
    saleEvents: saleEvents.map((saleEvent) => {
      const stripeInvoice = stripeCustomerInvoices.find(
        (invoice) => invoice.id === saleEvent.invoice_id,
      );

      const metadata = saleEvent.metadata
        ? JSON.parse(saleEvent.metadata)
        : undefined;

      return {
        id: saleEvent.event_id,
        timestamp: saleEvent.timestamp,
        amount: saleEvent.amount,
        currency: saleEvent.currency,
        invoiceId: saleEvent.invoice_id,
        productId: metadata?.productId,
        ...(stripeInvoice?.refunded && {
          status: "refunded" as const,
        }),
      };
    }),
  };
}

async function executeSideEffects(args: ExecuteSideEffectsArgs) {
  const {
    type,
    targetLink,
    targetCustomer,
    clickEvent,
    leadEvent,
    saleEvents,
    isFirstConversion,
    partnerId,
    programId,
    workspace,
  } = args;

  // Just to make TypeScript happy
  if (type === "custom") {
    throw new Error("Error");
  }

  const { totalSales, totalSaleAmount } = saleEvents.reduce(
    (acc, saleEvent) => {
      acc.totalSales++;
      acc.totalSaleAmount += saleEvent.amount;

      return acc;
    },
    {
      totalSales: 0,
      totalSaleAmount: 0,
    },
  );

  let lastLeadAt: Date | undefined = undefined;
  let lastConversionAt: Date | undefined = undefined;

  if (leadEvent) {
    lastLeadAt = new Date(leadEvent.timestamp);
  }

  const earliestSaleAt =
    saleEvents.length > 0
      ? new Date(
          Math.min(...saleEvents.map((e) => new Date(e.timestamp).getTime())),
        )
      : undefined;

  if (saleEvents.length > 0) {
    lastConversionAt = earliestSaleAt;
  }

  await prisma.$transaction([
    prisma.link.update({
      where: {
        id: targetLink.id,
      },
      data: {
        clicks: {
          increment: 1,
        },
        leads: {
          increment: 1,
        },
        lastLeadAt: updateLinkStatsForImporter({
          currentTimestamp: targetLink.lastLeadAt,
          newTimestamp: lastLeadAt || new Date(),
        }),
        ...(isFirstConversion && {
          conversions: {
            increment: 1,
          },
          lastConversionAt: updateLinkStatsForImporter({
            currentTimestamp: targetLink.lastConversionAt,
            newTimestamp: lastConversionAt || new Date(),
          }),
        }),
        sales: {
          increment: totalSales,
        },
        saleAmount: {
          increment: totalSaleAmount,
        },
      },
    }),

    prisma.customer.update({
      where: {
        id: targetCustomer.id,
      },
      data: {
        linkId: targetLink.id,
        programId: targetLink.programId,
        partnerId: targetLink.partnerId,
        clickId: clickEvent.id!,
        clickedAt: new Date(clickEvent.timestamp),
        sales: {
          increment: totalSales,
        },
        saleAmount: {
          increment: totalSaleAmount,
        },
        ...(type === CommissionType.sale &&
          !targetCustomer.firstSaleAt &&
          earliestSaleAt && {
            firstSaleAt: earliestSaleAt,
          }),
      },
    }),
  ]);

  await Promise.allSettled([
    syncPartnerLinksStats({
      partnerId,
      programId,
      eventType: type,
    }),

    executeWorkflows({
      trigger: "partnerMetricsUpdated",
      reason: "commission",
      identity: {
        workspaceId: workspace.id,
        programId,
        partnerId,
      },
      metrics: {
        current: {
          leads: type === CommissionType.lead ? 1 : 0,
          saleAmount: totalSaleAmount,
          conversions: isFirstConversion ? 1 : 0,
        },
      },
    }),
  ]);
}
