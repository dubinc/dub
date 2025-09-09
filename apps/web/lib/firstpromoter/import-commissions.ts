import { sendEmail } from "@dub/email";
import ProgramImported from "@dub/email/templates/program-imported";
import { prisma } from "@dub/prisma";
import { nanoid } from "@dub/utils";
import { CommissionStatus, Customer, Link, Program } from "@prisma/client";
import { convertCurrencyWithFxRates } from "../analytics/convert-currency";
import { isFirstConversion } from "../analytics/is-first-conversion";
import { createId } from "../api/create-id";
import { syncTotalCommissions } from "../api/partners/sync-total-commissions";
import { recordSaleWithTimestamp } from "../tinybird";
import { getLeadEvents } from "../tinybird/get-lead-events";
import { logImportError } from "../tinybird/log-import-error";
import { LeadEventTB } from "../types";
import { redis } from "../upstash";
import { clickEventSchemaTB } from "../zod/schemas/clicks";
import { FirstPromoterApi } from "./api";
import { firstPromoterImporter, MAX_BATCHES } from "./importer";
import { FirstPromoterCommission, FirstPromoterImportPayload } from "./types";

const toDubStatus: Record<FirstPromoterCommission["status"], CommissionStatus> =
  {
    pending: "pending",
    approved: "processed",
    denied: "canceled",
  };

export async function importCommissions(payload: FirstPromoterImportPayload) {
  const { importId, programId, userId, page = 1 } = payload;

  const program = await prisma.program.findUniqueOrThrow({
    where: {
      id: programId,
    },
  });

  const credentials = await firstPromoterImporter.getCredentials(
    program.workspaceId,
  );

  const firstPromoterApi = new FirstPromoterApi(credentials);

  const fxRates = await redis.hgetall<Record<string, string>>("fxRates:usd");

  let hasMore = true;
  let processedBatches = 0;
  let currentPage = page;

  while (processedBatches < MAX_BATCHES) {
    const commissions = await firstPromoterApi.listCommissions({
      page: currentPage,
    });

    if (commissions.length === 0) {
      hasMore = false;
      break;
    }

    const customersData = await prisma.customer.findMany({
      where: {
        projectId: program.workspaceId,
        email: {
          in: commissions
            .map(({ referral }) => referral?.email)
            .filter((email): email is string => email !== null),
        },
      },
      include: {
        link: true,
      },
      orderBy: {
        createdAt: "asc",
      },
    });

    const customerLeadEvents = await getLeadEvents({
      customerIds: customersData.map(({ id }) => id),
    }).then((res) => res.data);

    await Promise.allSettled(
      commissions.map((commission) =>
        createCommission({
          program,
          commission,
          fxRates,
          customersData,
          customerLeadEvents,
          importId,
        }),
      ),
    );

    currentPage++;
    processedBatches++;
  }

  await firstPromoterImporter.queue({
    ...payload,
    action: hasMore ? "import-commissions" : "update-stripe-customers",
    page: hasMore ? currentPage : undefined,
  });

  // Imports finished
  if (!hasMore) {
    await firstPromoterImporter.deleteCredentials(program.workspaceId);

    const workspaceUser = await prisma.projectUsers.findUniqueOrThrow({
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

    if (workspaceUser && workspaceUser.user.email) {
      await sendEmail({
        email: workspaceUser.user.email,
        subject: "FirstPromoter campaign imported",
        react: ProgramImported({
          email: workspaceUser.user.email,
          workspace: workspaceUser.project,
          program,
          provider: "FirstPromoter",
          importId,
        }),
      });
    }
  }
}

async function createCommission({
  program,
  commission,
  fxRates,
  customersData,
  customerLeadEvents,
  importId,
}: {
  program: Program;
  commission: FirstPromoterCommission;
  fxRates: Record<string, string> | null;
  customersData: (Customer & { link: Link | null })[];
  customerLeadEvents: LeadEventTB[];
  importId: string;
}) {
  const commonImportLogInputs = {
    workspace_id: program.workspaceId,
    import_id: importId,
    source: "firstpromoter",
    entity: "commission",
    entity_id: `${commission.id}`,
  } as const;

  if (commission.is_self_referral) {
    await logImportError({
      ...commonImportLogInputs,
      code: "SELF_REFERRAL",
      message: `Self-referral commission ${commission.id}.`,
    });

    return;
  }

  if (commission.unit !== "cash") {
    await logImportError({
      ...commonImportLogInputs,
      code: "NOT_SUPPORTED_UNIT",
      message: `Invalid unit ${commission.unit} for commission ${commission.id}.`,
    });

    return;
  }

  // Find the commission
  const commissionFound = await prisma.commission.findUnique({
    where: {
      invoiceId_programId: {
        invoiceId: `${commission.id}`, // this is not the actual invoice ID, but we use this to deduplicate the sales
        programId: program.id,
      },
    },
  });

  if (commissionFound) {
    console.log(`Commission ${commission.id} already exists, skipping...`);
    return;
  }

  // Find the customer
  const customer = customersData.find(
    ({ email }) => email === commission.referral?.email,
  );

  if (!customer) {
    await logImportError({
      ...commonImportLogInputs,
      code: "CUSTOMER_NOT_FOUND",
      message: `No customer ${commission.referral?.email} found for commission ${commission.id}.`,
    });

    return;
  }

  // Sale amount (can potentially be null)
  let saleAmount = Number(commission.original_sale_amount ?? 0);
  const saleCurrency = commission.original_sale_currency ?? "usd";

  if (saleAmount > 0 && saleCurrency.toUpperCase() !== "USD" && fxRates) {
    const { amount: convertedAmount } = convertCurrencyWithFxRates({
      currency: saleCurrency,
      amount: saleAmount,
      fxRates,
    });

    saleAmount = convertedAmount;
  }

  // Earnings
  let earnings = commission.amount;

  // here, we also check for commissions that have already been recorded on Dub
  // e.g. during the transition period
  // since we don't have the Stripe invoiceId from Rewardful, we use the referral's Stripe customer ID
  // and check for commissions that were created with the same amount and within a +-1 hour window
  const chargedAt = new Date(commission.amount);
  const trackedCommission = await prisma.commission.findFirst({
    where: {
      programId: program.id,
      createdAt: {
        gte: new Date(chargedAt.getTime() - 60 * 60 * 1000), // 1 hour before
        lte: new Date(chargedAt.getTime() + 60 * 60 * 1000), // 1 hour after
      },
      customerId: customer.id,
      type: "sale",
      amount: saleAmount,
    },
  });

  if (trackedCommission) {
    console.log(
      `Commission ${trackedCommission.id} with sale amount ${saleAmount} was already recorded on Dub. Skipping...`,
    );

    return;
  }

  if (!customer.linkId) {
    await logImportError({
      ...commonImportLogInputs,
      code: "LINK_NOT_FOUND",
      message: `No link found for customer ${customer.id}.`,
    });

    return;
  }

  if (!customer.clickId) {
    await logImportError({
      ...commonImportLogInputs,
      code: "CLICK_NOT_FOUND",
      message: `No click ID found for customer ${customer.id}.`,
    });

    return;
  }

  if (!customer.link?.partnerId) {
    await logImportError({
      ...commonImportLogInputs,
      code: "PARTNER_NOT_FOUND",
      message: `No partner ID found for customer ${customer.id}.`,
    });

    return;
  }

  // Find the customer lead event
  const leadEvent = customerLeadEvents.find(
    (event) => event.customer_id === customer.id,
  );

  if (!leadEvent) {
    console.log(`No lead event found for customer ${customer.id}.`);
    await logImportError({
      ...commonImportLogInputs,
      code: "LEAD_NOT_FOUND",
      message: `No lead event found for customer ${customer.id}.`,
    });

    return;
  }

  // Customer click event
  const clickData = clickEventSchemaTB
    .omit({ timestamp: true })
    .parse(leadEvent);

  const eventId = nanoid(16);

  // Decide the commission status
  let status: CommissionStatus = toDubStatus[commission.status];

  if (commission.is_paid) {
    status = "paid";
  }

  await Promise.allSettled([
    prisma.commission.create({
      data: {
        id: createId({ prefix: "cm_" }),
        eventId,
        type: commission.commission_type,
        programId: program.id,
        partnerId: customer.link.partnerId,
        linkId: customer.linkId,
        customerId: customer.id,
        amount: saleAmount,
        earnings,
        currency: "usd",
        quantity: 1,
        status,
        invoiceId: `${commission.id}`, // this is not the actual invoice ID, but we use this to deduplicate the sales
        createdAt: new Date(commission.created_at),
        description: commission.external_note || null,
      },
    }),

    recordSaleWithTimestamp({
      ...clickData,
      event_id: eventId,
      event_name: "Invoice paid",
      amount: saleAmount,
      customer_id: customer.id,
      payment_processor: "stripe",
      currency: "usd",
      metadata: JSON.stringify(commission.metadata),
      timestamp: new Date(commission.created_at).toISOString(),
    }),

    // update link stats
    prisma.link.update({
      where: {
        id: customer.linkId,
      },
      data: {
        ...(isFirstConversion({
          customer: customer,
          linkId: customer.linkId,
        }) && {
          conversions: {
            increment: 1,
          },
        }),
        sales: {
          increment: 1,
        },
        saleAmount: {
          increment: saleAmount,
        },
      },
    }),

    // update customer stats
    prisma.customer.update({
      where: {
        id: customer.id,
      },
      data: {
        sales: {
          increment: 1,
        },
        saleAmount: {
          increment: saleAmount,
        },
      },
    }),
  ]);

  await syncTotalCommissions({
    partnerId: customer.link.partnerId,
    programId: program.id,
  });
}
