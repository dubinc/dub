import { sendEmail } from "@dub/email";
import ProgramImported from "@dub/email/templates/program-imported";
import { prisma } from "@dub/prisma";
import { nanoid } from "@dub/utils";
import { CommissionStatus, Customer, Link, Program } from "@prisma/client";
import { convertCurrencyWithFxRates } from "../analytics/convert-currency";
import { isFirstConversion } from "../analytics/is-first-conversion";
import { createId } from "../api/create-id";
import { updateLinkStatsForImporter } from "../api/links/update-link-stats-for-importer";
import { syncTotalCommissions } from "../api/partners/sync-total-commissions";
import { getLeadEvents } from "../tinybird/get-lead-events";
import { logImportError } from "../tinybird/log-import-error";
import { recordSaleWithTimestamp } from "../tinybird/record-sale";
import { LeadEventTB } from "../types";
import { redis } from "../upstash";
import { clickEventSchemaTB } from "../zod/schemas/clicks";
import { RewardfulApi } from "./api";
import { MAX_BATCHES, rewardfulImporter } from "./importer";
import { RewardfulCommission, RewardfulImportPayload } from "./types";

const toDubStatus: Record<RewardfulCommission["state"], CommissionStatus> = {
  pending: "pending",
  due: "pending",
  paid: "paid",
  voided: "canceled",
};

export async function importCommissions(payload: RewardfulImportPayload) {
  const { importId, programId, userId, campaignIds, page = 1 } = payload;

  const program = await prisma.program.findUniqueOrThrow({
    where: {
      id: programId,
    },
  });

  const { token } = await rewardfulImporter.getCredentials(program.workspaceId);

  const rewardfulApi = new RewardfulApi({ token });

  const fxRates = await redis.hgetall<Record<string, string>>("fxRates:usd");

  let currentPage = page;
  let hasMore = true;
  let processedBatches = 0;

  while (hasMore && processedBatches < MAX_BATCHES) {
    const commissions = await rewardfulApi.listCommissions({
      page: currentPage,
    });

    if (commissions.length === 0) {
      hasMore = false;
      break;
    }

    const customersData = await prisma.customer.findMany({
      where: {
        stripeCustomerId: {
          in: commissions
            .map((commission) => commission.sale.referral.stripe_customer_id)
            .filter(Boolean),
        },
      },
      include: {
        link: true,
      },
    });

    const customerLeadEvents = await getLeadEvents({
      customerIds: customersData.map((customer) => customer.id),
    }).then((res) => res.data);

    await Promise.all(
      commissions.map((commission) =>
        createCommission({
          commission,
          program,
          campaignIds,
          fxRates,
          importId,
          customersData,
          customerLeadEvents,
        }),
      ),
    );

    currentPage++;
    processedBatches++;
  }

  if (hasMore) {
    await rewardfulImporter.queue({
      ...payload,
      action: "import-commissions",
      page: currentPage,
    });

    return;
  }

  // Imports finished
  await rewardfulImporter.deleteCredentials(program.workspaceId);

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
      subject: "Rewardful campaign imported",
      react: ProgramImported({
        email: workspaceUser.user.email,
        workspace: workspaceUser.project,
        program,
        provider: "Rewardful",
        importId,
      }),
    });
  }
}

// Backfill historical commissions
async function createCommission({
  commission,
  program,
  campaignIds,
  fxRates,
  importId,
  customersData,
  customerLeadEvents,
}: {
  commission: RewardfulCommission;
  program: Program;
  campaignIds: string[];
  fxRates: Record<string, string> | null;
  importId: string;
  customersData: (Customer & { link: Link | null })[];
  customerLeadEvents: LeadEventTB[];
}) {
  const commonImportLogInputs = {
    workspace_id: program.workspaceId,
    import_id: importId,
    source: "rewardful",
    entity: "commission",
    entity_id: commission.id,
  } as const;

  if (commission.campaign.id && !campaignIds.includes(commission.campaign.id)) {
    console.log(
      `Affiliate ${commission?.sale?.affiliate?.email} for commission ${commission.id}) not in campaignIds (${campaignIds.join(", ")}) (they're in ${commission.campaign.id}). Skipping...`,
    );

    return;
  }

  const { sale } = commission;

  if (
    !sale.referral.stripe_customer_id ||
    !sale.referral.stripe_customer_id.startsWith("cus_")
  ) {
    await logImportError({
      ...commonImportLogInputs,
      code: "STRIPE_CUSTOMER_NOT_FOUND",
      message: `No Stripe customer ID provided for referral ${sale.referral.id}`,
    });

    return;
  }

  const commissionFound = await prisma.commission.findUnique({
    where: {
      invoiceId_programId: {
        invoiceId: sale.id,
        programId: program.id,
      },
    },
  });

  if (commissionFound) {
    console.log(`Commission ${commission.id} already exists, skipping...`);
    return;
  }

  // Sale amount
  let amount = sale.sale_amount_cents;
  const saleCurrency = sale.currency.toUpperCase();

  if (saleCurrency !== "USD" && fxRates) {
    const { amount: convertedAmount } = convertCurrencyWithFxRates({
      currency: saleCurrency,
      amount,
      fxRates,
    });

    amount = convertedAmount;
  }

  // Earnings
  let earnings = commission.amount;
  const earningsCurrency = commission.currency.toUpperCase();

  if (earningsCurrency !== "USD" && fxRates) {
    const { amount: convertedAmount } = convertCurrencyWithFxRates({
      currency: earningsCurrency,
      amount: earnings,
      fxRates,
    });

    earnings = convertedAmount;
  }

  // here, we also check for commissions that have already been recorded on Dub
  // e.g. during the transition period
  // since we don't have the Stripe invoiceId from Rewardful, we use the referral's Stripe customer ID
  // and check for commissions that were created with the same amount and within a +-1 hour window
  const chargedAt = new Date(sale.charged_at);
  const trackedCommission = await prisma.commission.findFirst({
    where: {
      programId: program.id,
      createdAt: {
        gte: new Date(chargedAt.getTime() - 60 * 60 * 1000), // 1 hour before
        lte: new Date(chargedAt.getTime() + 60 * 60 * 1000), // 1 hour after
      },
      customer: {
        stripeCustomerId: sale.referral.stripe_customer_id,
      },
      type: "sale",
      amount: amount,
    },
  });

  if (trackedCommission) {
    console.log(
      `Commission ${commission.id} with sale amount ${amount} was already recorded on Dub. Skipping...`,
    );

    return;
  }

  const customerFound = customersData.find(
    (customer) =>
      customer.stripeCustomerId === sale.referral.stripe_customer_id,
  );

  if (!customerFound) {
    await logImportError({
      ...commonImportLogInputs,
      code: "CUSTOMER_NOT_FOUND",
      message: `No customer found for Stripe customer ID ${sale.referral.stripe_customer_id}.`,
    });

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
      message: `No click ID found for customer ${customerFound.id}.`,
    });

    return;
  }

  if (!customerFound.link?.partnerId) {
    await logImportError({
      ...commonImportLogInputs,
      code: "PARTNER_NOT_FOUND",
      message: `No partner ID found for customer ${customerFound.id}.`,
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
        amount,
        earnings,
        // TODO: allow custom "defaultCurrency" on workspace table in the future
        currency: "usd",
        quantity: 1,
        status: toDubStatus[commission.state],
        invoiceId: sale.id, // this is not the actual invoice ID, but we use this to deduplicate the sales
        createdAt: new Date(sale.created_at),
      },
    }),

    recordSaleWithTimestamp({
      ...clickData,
      event_id: eventId,
      event_name: "Invoice paid",
      amount,
      customer_id: customerFound.id,
      payment_processor: "stripe",
      // TODO: allow custom "defaultCurrency" on workspace table in the future
      currency: "usd",
      metadata: JSON.stringify(commission),
      timestamp: new Date(sale.created_at).toISOString(),
    }),

    // update link stats
    prisma.link.update({
      where: { id: customerFound.linkId },
      data: {
        ...(isFirstConversion({
          customer: customerFound,
          linkId: customerFound.linkId,
        }) && {
          conversions: {
            increment: 1,
          },
          lastConversionAt: updateLinkStatsForImporter({
            currentTimestamp: customerFound.link.lastConversionAt,
            newTimestamp: new Date(commission.created_at),
          }),
        }),
        sales: { increment: 1 },
        saleAmount: { increment: amount },
      },
    }),

    // update customer stats
    prisma.customer.update({
      where: { id: customerFound.id },
      data: {
        sales: { increment: 1 },
        saleAmount: { increment: amount },
      },
    }),
  ]);

  await syncTotalCommissions({
    partnerId: customerFound.link.partnerId,
    programId: program.id,
  });
}
