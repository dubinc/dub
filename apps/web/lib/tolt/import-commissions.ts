import { sendEmail } from "@dub/email";
import ProgramImported from "@dub/email/templates/program-imported";
import { prisma } from "@dub/prisma";
import { nanoid } from "@dub/utils";
import { CommissionStatus, Customer, Link, Program } from "@prisma/client";
import { convertCurrencyWithFxRates } from "../analytics/convert-currency";
import { isFirstConversion } from "../analytics/is-first-conversion";
import { createId } from "../api/create-id";
import { syncTotalCommissions } from "../api/partners/sync-total-commissions";
import { getLeadEvents } from "../tinybird/get-lead-events";
import { logImportError } from "../tinybird/log-import-error";
import { recordSaleWithTimestamp } from "../tinybird/record-sale";
import { LeadEventTB } from "../types";
import { redis } from "../upstash";
import { clickEventSchemaTB } from "../zod/schemas/clicks";
import { ToltApi } from "./api";
import { MAX_BATCHES, toltImporter } from "./importer";
import { ToltCommission, ToltImportPayload } from "./types";

const toDubStatus: Record<ToltCommission["status"], CommissionStatus> = {
  pending: "pending",
  approved: "pending",
  paid: "paid",
  rejected: "canceled",
  refunded: "refunded",
};

export async function importCommissions(payload: ToltImportPayload) {
  let { importId, programId, toltProgramId, userId, startingAfter } = payload;

  const program = await prisma.program.findUniqueOrThrow({
    where: {
      id: programId,
    },
  });

  const { token } = await toltImporter.getCredentials(program.workspaceId);
  const toltApi = new ToltApi({ token });

  const toltProgram = await toltApi.getProgram({
    programId: toltProgramId,
  });

  const fxRates = await redis.hgetall<Record<string, string>>("fxRates:usd");

  let hasMore = true;
  let processedBatches = 0;

  while (hasMore && processedBatches < MAX_BATCHES) {
    const commissions = await toltApi.listCommissions({
      programId: toltProgramId,
      startingAfter,
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
            .map((commission) => commission.customer.email)
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
      customerIds: customersData.map((customer) => customer.id),
    }).then((res) => res.data);

    await Promise.allSettled(
      commissions.map((commission) =>
        createCommission({
          program,
          commission,
          fxRates,
          programCurrency: toltProgram.currency_code.toLowerCase(),
          importId,
          customersData,
          customerLeadEvents,
        }),
      ),
    );

    await new Promise((resolve) => setTimeout(resolve, 2000));

    startingAfter = commissions[commissions.length - 1].id;
    processedBatches++;
  }

  if (hasMore) {
    await toltImporter.queue({
      ...payload,
      startingAfter,
      action: "import-commissions",
    });

    return;
  }

  await toltImporter.deleteCredentials(program.workspaceId);

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
      to: workspaceUser.user.email,
      subject: "Tolt program imported",
      react: ProgramImported({
        email: workspaceUser.user.email,
        workspace: workspaceUser.project,
        program,
        provider: "Tolt",
        importId,
      }),
    });
  }

  await toltImporter.queue({
    ...payload,
    startingAfter: undefined,
    action: "update-stripe-customers",
  });
}

// Backfill historical commissions
async function createCommission({
  program,
  commission,
  fxRates,
  programCurrency,
  importId,
  customersData,
  customerLeadEvents,
}: {
  program: Program;
  commission: ToltCommission;
  fxRates: Record<string, string> | null;
  programCurrency: string;
  importId: string;
  customersData: (Customer & { link: Link | null })[];
  customerLeadEvents: LeadEventTB[];
}) {
  const commonImportLogInputs = {
    workspace_id: program.workspaceId,
    import_id: importId,
    source: "tolt",
    entity: "commission",
    entity_id: commission.id,
  } as const;

  const { customer, partner, ...sale } = commission;

  if (!sale.transaction_id) {
    await logImportError({
      ...commonImportLogInputs,
      code: "TRANSACTION_NOT_FOUND",
      message: `No transaction ID provided for commission ${commission.id}`,
    });

    return;
  }

  const commissionFound = await prisma.commission.findUnique({
    where: {
      invoiceId_programId: {
        invoiceId: sale.transaction_id,
        programId: program.id,
      },
    },
  });

  if (commissionFound) {
    console.log(`Commission ${commission.id} already exists, skipping...`);
    return;
  }

  const customerFound = customersData.find(
    ({ email }) => email === customer.email,
  );

  if (!customerFound) {
    await logImportError({
      ...commonImportLogInputs,
      code: "CUSTOMER_NOT_FOUND",
      message: `No customer ${customer.email} found for commission ${commission.id}.`,
    });

    return;
  }

  // Sale amount (can potentially be null)
  let saleAmount = Number(sale.revenue ?? 0);

  if (programCurrency.toUpperCase() !== "USD" && fxRates) {
    const { amount: convertedAmount } = convertCurrencyWithFxRates({
      currency: programCurrency,
      amount: saleAmount,
      fxRates,
    });

    saleAmount = convertedAmount;
  }

  // Earnings
  let earnings = Number(commission.amount);

  if (programCurrency.toUpperCase() !== "USD" && fxRates) {
    const { amount: convertedAmount } = convertCurrencyWithFxRates({
      currency: programCurrency,
      amount: earnings,
      fxRates,
    });

    earnings = convertedAmount;
  }

  // here, we also check for commissions that have already been recorded on Dub
  // e.g. during the transition period
  // since we don't have the Stripe invoiceId from Tolt, we use the referral's customer ID
  // and check for commissions that were created with the same amount and within a +-1 hour window
  const chargedAt = new Date(sale.created_at);
  const trackedCommission = await prisma.commission.findFirst({
    where: {
      programId: program.id,
      createdAt: {
        gte: new Date(chargedAt.getTime() - 60 * 60 * 1000), // 1 hour before
        lte: new Date(chargedAt.getTime() + 60 * 60 * 1000), // 1 hour after
      },
      customerId: customerFound.id,
      type: "sale",
      amount: saleAmount,
    },
  });

  if (trackedCommission) {
    console.log(
      `Commission ${trackedCommission.id} was already recorded on Dub, skipping...`,
    );
    return;
  }

  if (!customerFound.linkId) {
    await logImportError({
      ...commonImportLogInputs,
      code: "LINK_NOT_FOUND",
      message: `No link found for customer ${customerFound.id}.`,
    });

    return;
  }

  if (!customerFound.clickId) {
    await logImportError({
      ...commonImportLogInputs,
      code: "CLICK_NOT_FOUND",
      message: `No click found for customer ${customerFound.id}.`,
    });

    return;
  }

  if (!customerFound.link?.partnerId) {
    await logImportError({
      ...commonImportLogInputs,
      code: "PARTNER_NOT_FOUND",
      message: `No partner found for customer ${customerFound.id}.`,
    });

    return;
  }

  const leadEvent = customerLeadEvents.find(
    (event) => event.customer_id === customerFound.id,
  );

  if (!leadEvent) {
    await logImportError({
      ...commonImportLogInputs,
      code: "LEAD_NOT_FOUND",
      message: `No lead event found for customer ${customerFound.id}.`,
    });

    return;
  }

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
        partnerId: customerFound.link.partnerId,
        linkId: customerFound.linkId,
        customerId: customerFound.id,
        amount: saleAmount,
        earnings,
        // TODO: allow custom "defaultCurrency" on workspace table in the future
        currency: "usd",
        quantity: 1,
        status: toDubStatus[commission.status],
        invoiceId: sale.transaction_id, // this is not the actual invoice ID, but we use this to deduplicate the sales
        createdAt: new Date(sale.created_at),
      },
    }),

    saleAmount > 0 &&
      recordSaleWithTimestamp({
        ...clickData,
        event_id: eventId,
        event_name: "Invoice paid",
        amount: saleAmount,
        customer_id: customerFound.id,
        payment_processor: "stripe",
        // TODO: allow custom "defaultCurrency" on workspace table in the future
        currency: "usd",
        metadata: JSON.stringify(commission),
        timestamp: new Date(sale.created_at).toISOString(),
      }),

    // update link stats (if sale amount is greater than 0)
    prisma.link.update({
      where: {
        id: customerFound.linkId,
      },
      data: {
        ...(isFirstConversion({
          customer: customerFound,
          linkId: customerFound.linkId,
        }) && {
          conversions: {
            increment: 1,
          },
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

    // update customer stats (if sale amount is greater than 0)
    saleAmount > 0 &&
      prisma.customer.update({
        where: {
          id: customerFound.id,
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
    partnerId: customerFound.link.partnerId,
    programId: program.id,
  });
}
