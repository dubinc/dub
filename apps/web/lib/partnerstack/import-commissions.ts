import { prisma } from "@dub/prisma";
import { nanoid } from "@dub/utils";
import { CommissionStatus, Customer, Link, Program } from "@prisma/client";
import { convertCurrencyWithFxRates } from "../analytics/convert-currency";
import { isFirstConversion } from "../analytics/is-first-conversion";
import { createId } from "../api/create-id";
import { updateLinkStatsForImporter } from "../api/links/update-link-stats-for-importer";
import { syncTotalCommissions } from "../api/partners/sync-total-commissions";
import { recordSaleWithTimestamp } from "../tinybird";
import { getLeadEvents } from "../tinybird/get-lead-events";
import { logImportError } from "../tinybird/log-import-error";
import { LeadEventTB } from "../types";
import { redis } from "../upstash";
import { clickEventSchemaTB } from "../zod/schemas/clicks";
import { PartnerStackApi } from "./api";
import { MAX_BATCHES, partnerStackImporter } from "./importer";
import { PartnerStackCommission, PartnerStackImportPayload } from "./types";

const toDubStatus: Record<
  PartnerStackCommission["reward_status"],
  CommissionStatus
> = {
  hold: "fraud",
  pending: "pending",
  approved: "processed",
  declined: "canceled",
  paid: "paid",
};

export async function importCommissions(payload: PartnerStackImportPayload) {
  const { importId, programId, startingAfter } = payload;

  const program = await prisma.program.findUniqueOrThrow({
    where: {
      id: programId,
    },
  });

  const { publicKey, secretKey } = await partnerStackImporter.getCredentials(
    program.workspaceId,
  );

  const partnerStackApi = new PartnerStackApi({
    publicKey,
    secretKey,
  });

  const fxRates = await redis.hgetall<Record<string, string>>("fxRates:usd");

  let hasMore = true;
  let processedBatches = 0;
  let currentStartingAfter = startingAfter;

  while (hasMore && processedBatches < MAX_BATCHES) {
    const commissions = await partnerStackApi.listCommissions({
      startingAfter: currentStartingAfter,
    });

    if (commissions.length === 0) {
      hasMore = false;
      break;
    }

    const customersData = await prisma.customer.findMany({
      where: {
        projectId: program.workspaceId,
        OR: [
          {
            email: {
              in: commissions
                .map((commission) => commission.customer?.email)
                .filter((email): email is string => email !== null),
            },
          },
          {
            externalId: {
              in: commissions
                .map((commission) => commission.customer?.external_key)
                .filter(
                  (externalKey): externalKey is string => externalKey !== null,
                ),
            },
          },
        ],
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
          importId,
          customersData,
          customerLeadEvents,
        }),
      ),
    );

    await new Promise((resolve) => setTimeout(resolve, 1000));

    currentStartingAfter = commissions[commissions.length - 1].key;
    processedBatches++;
  }

  if (!hasMore) {
    await partnerStackImporter.deleteCredentials(program.workspaceId);
  }

  await partnerStackImporter.queue({
    ...payload,
    startingAfter: hasMore ? currentStartingAfter : undefined,
    action: hasMore ? "import-commissions" : "update-stripe-customers",
  });
}

async function createCommission({
  program,
  commission,
  fxRates,
  importId,
  customersData,
  customerLeadEvents,
}: {
  program: Program;
  commission: PartnerStackCommission;
  fxRates: Record<string, string> | null;
  importId: string;
  customersData: (Customer & { link: Link | null })[];
  customerLeadEvents: LeadEventTB[];
}) {
  const commonImportLogInputs = {
    workspace_id: program.workspaceId,
    import_id: importId,
    source: "partnerstack",
    entity: "commission",
    entity_id: commission.key,
  } as const;

  if (!commission.transaction) {
    await logImportError({
      ...commonImportLogInputs,
      code: "TRANSACTION_NOT_FOUND",
      message: `Commission ${commission.key} has no transaction.`,
    });

    return;
  }

  if (!commission.customer) {
    await logImportError({
      ...commonImportLogInputs,
      code: "CUSTOMER_NOT_FOUND",
      message: `Commission ${commission.key} has no customer.`,
    });

    return;
  }

  const commissionFound = await prisma.commission.findUnique({
    where: {
      invoiceId_programId: {
        invoiceId: commission.key, // This is not the actual invoice ID, but we use this to deduplicate the commissions
        programId: program.id,
      },
    },
  });

  if (commissionFound) {
    console.log(`Commission ${commission.key} already exists, skipping...`);
    return;
  }

  const customer = customersData.find(
    ({ email, externalId }) =>
      email === commission.customer?.email ||
      externalId === commission.customer?.external_key,
  );

  if (!customer) {
    await logImportError({
      ...commonImportLogInputs,
      code: "CUSTOMER_NOT_FOUND",
      message: `No customer found for customer email ${commission.customer.email}.`,
    });

    return;
  }

  // Sale amount
  let amount = commission.transaction.amount;
  const saleCurrency = commission.transaction.currency;

  if (saleCurrency.toUpperCase() !== "USD" && fxRates) {
    const { amount: convertedAmount } = convertCurrencyWithFxRates({
      currency: saleCurrency,
      amount,
      fxRates,
    });

    amount = convertedAmount;
  }

  // Earnings
  let earnings = commission.amount;
  const earningsCurrency = commission.currency;

  if (earningsCurrency.toUpperCase() !== "USD" && fxRates) {
    const { amount: convertedAmount } = convertCurrencyWithFxRates({
      currency: earningsCurrency,
      amount: earnings,
      fxRates,
    });

    earnings = convertedAmount;
  }

  // here, we also check for commissions that have already been recorded on Dub
  // e.g. during the transition period
  // since we don't have the Stripe invoiceId from PartnerStack, we use the referral's customer ID
  // and check for commissions that were created with the same amount and within a +-1 hour window
  const chargedAt = new Date(commission.created_at);
  const trackedCommission = await prisma.commission.findFirst({
    where: {
      programId: program.id,
      createdAt: {
        gte: new Date(chargedAt.getTime() - 60 * 60 * 1000), // 1 hour before
        lte: new Date(chargedAt.getTime() + 60 * 60 * 1000), // 1 hour after
      },
      customerId: customer.id,
      type: "sale",
      amount: commission.transaction.amount,
    },
  });

  if (trackedCommission) {
    console.log(
      `Commission ${trackedCommission.id} was already recorded on Dub, skipping...`,
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
      message: `No click found for customer ${customer.id}.`,
    });

    return;
  }

  if (!customer.link?.partnerId) {
    await logImportError({
      ...commonImportLogInputs,
      code: "PARTNER_NOT_FOUND",
      message: `No partner found for customer ${customer.id}.`,
    });

    return;
  }

  const leadEvent = customerLeadEvents.find(
    (event) => event.customer_id === customer.id,
  );

  if (!leadEvent) {
    await logImportError({
      ...commonImportLogInputs,
      code: "LEAD_NOT_FOUND",
      message: `No lead event found for customer ${customer.id}.`,
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
        partnerId: customer.link.partnerId,
        linkId: customer.linkId,
        customerId: customer.id,
        amount,
        earnings,
        // TODO: allow custom "defaultCurrency" on workspace table in the future
        currency: "usd",
        quantity: 1,
        status: toDubStatus[commission.reward_status],
        invoiceId: commission.key, // this is not the actual invoice ID, but we use this to deduplicate the sales
        createdAt: new Date(commission.created_at),
      },
    }),

    recordSaleWithTimestamp({
      ...clickData,
      event_id: eventId,
      event_name: "Invoice paid",
      amount,
      customer_id: customer.id,
      payment_processor: "stripe",
      // TODO: allow custom "defaultCurrency" on workspace table in the future
      currency: "usd",
      metadata: JSON.stringify(commission),
      timestamp: new Date(commission.created_at).toISOString(),
    }),

    // update link stats
    prisma.link.update({
      where: {
        id: customer.linkId,
      },
      data: {
        ...(isFirstConversion({
          customer,
          linkId: customer.linkId,
        }) && {
          conversions: {
            increment: 1,
          },
          lastConversionAt: updateLinkStatsForImporter({
            currentTimestamp: customer.link.lastConversionAt,
            newTimestamp: new Date(commission.created_at),
          }),
        }),
        sales: {
          increment: 1,
        },
        saleAmount: {
          increment: amount,
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
          increment: amount,
        },
      },
    }),
  ]);

  await syncTotalCommissions({
    partnerId: customer.link.partnerId,
    programId: program.id,
  });
}
