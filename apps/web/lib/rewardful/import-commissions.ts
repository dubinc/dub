import { sendEmail } from "@dub/email";
import { CampaignImported } from "@dub/email/templates/campaign-imported";
import { prisma } from "@dub/prisma";
import { nanoid } from "@dub/utils";
import { CommissionStatus, Program } from "@prisma/client";
import { createId } from "../api/create-id";
import { getLeadEvent } from "../tinybird";
import { recordSaleWithTimestamp } from "../tinybird/record-sale";
import { clickEventSchemaTB } from "../zod/schemas/clicks";
import { RewardfulApi } from "./api";
import { MAX_BATCHES, rewardfulImporter } from "./importer";
import { RewardfulCommission } from "./types";

export async function importCommissions({
  programId,
  page,
}: {
  programId: string;
  page: number;
}) {
  const program = await prisma.program.findUniqueOrThrow({
    where: {
      id: programId,
    },
  });

  const { token, userId, campaignId } = await rewardfulImporter.getCredentials(
    program.workspaceId,
  );

  const rewardfulApi = new RewardfulApi({ token });

  let currentPage = page;
  let hasMoreCommissions = true;
  let processedBatches = 0;

  while (hasMoreCommissions && processedBatches < MAX_BATCHES) {
    const commissions = await rewardfulApi.listCommissions({
      page: currentPage,
    });

    if (commissions.length === 0) {
      hasMoreCommissions = false;
      break;
    }

    await Promise.all(
      commissions.map((commission) =>
        createCommission({
          commission,
          program,
          campaignId,
        }),
      ),
    );

    await new Promise((resolve) => setTimeout(resolve, 2000));
    currentPage++;
    processedBatches++;
  }

  if (hasMoreCommissions) {
    return await rewardfulImporter.queue({
      programId: program.id,
      action: "import-commissions",
      page: currentPage,
    });
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
      email: workspaceUser.user.email,
      subject: "Rewardful campaign imported",
      react: CampaignImported({
        email: workspaceUser.user.email,
        workspace: workspaceUser.project,
        program,
        provider: "Rewardful",
      }),
    });
  }
}

// Backfill historical commissions
async function createCommission({
  commission,
  program,
  campaignId,
}: {
  commission: RewardfulCommission;
  program: Program;
  campaignId: string;
}) {
  if (commission.campaign.id !== campaignId) {
    console.log(
      `Affiliate ${commission?.sale?.affiliate?.email} for commission ${commission.id}) not in campaign ${campaignId} (they're in ${commission.campaign.id}). Skipping...`,
    );
    return;
  }

  const { sale } = commission;

  if (
    !sale.referral.stripe_customer_id ||
    !sale.referral.stripe_customer_id.startsWith("cus_")
  ) {
    console.log(
      `No Stripe customer ID provided for referral ${sale.referral.id}, skipping...`,
    );
    return;
  }

  const commissionFound = await prisma.commission.findUnique({
    where: {
      programId_invoiceId: {
        programId: program.id,
        invoiceId: sale.id,
      },
    },
  });

  if (commissionFound) {
    console.log(`Commission ${commission.id} already exists, skipping...`);
    return;
  }

  // here, we also check for commissions that have already been recorded on Dub
  // e.g. during the transition period
  // since we don't have the Stripe invoiceId from Rewardful, we use the referral's Stripe customer ID
  // and check for commissions that were created with the same amount and within a +-1 hour window
  const chargedAt = new Date(sale.charged_at);
  const trackedCommission = await prisma.commission.findFirst({
    where: {
      programId: program.id,
      type: "sale",
      customer: {
        stripeCustomerId: sale.referral.stripe_customer_id,
      },
      amount: sale.sale_amount_cents,
      createdAt: {
        gte: new Date(chargedAt.getTime() - 60 * 60 * 1000), // 1 hour before
        lte: new Date(chargedAt.getTime() + 60 * 60 * 1000), // 1 hour after
      },
    },
  });

  if (trackedCommission) {
    console.log(
      `Commission ${trackedCommission.id} was already recorded on Dub, skipping...`,
    );
    return;
  }

  const customerFound = await prisma.customer.findUnique({
    where: {
      stripeCustomerId: sale.referral.stripe_customer_id,
    },
    include: {
      link: true,
    },
  });

  if (!customerFound) {
    console.log(
      `No customer found for Stripe customer ID ${sale.referral.stripe_customer_id}, skipping...`,
    );
    return;
  }

  if (
    !customerFound.linkId ||
    !customerFound.clickId ||
    !customerFound.link?.partnerId
  ) {
    console.log(
      `No link or click ID or partner ID found for customer ${customerFound.id}, skipping...`,
    );
    return;
  }

  const leadEvent = await getLeadEvent({
    customerId: customerFound.id,
  });

  if (!leadEvent || leadEvent.data.length === 0) {
    console.log(
      `No lead event found for customer ${customerFound.id}, skipping...`,
    );
    return;
  }

  const clickData = clickEventSchemaTB
    .omit({ timestamp: true })
    .parse(leadEvent.data[0]);

  const eventId = nanoid(16);

  const toDubStatus: Record<RewardfulCommission["state"], CommissionStatus> = {
    pending: "pending",
    due: "pending",
    paid: "paid",
    voided: "duplicate",
  };

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
        amount: sale.sale_amount_cents,
        earnings: commission.amount,
        currency: sale.currency.toLowerCase(),
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
      amount: sale.sale_amount_cents,
      customer_id: customerFound.id,
      payment_processor: "stripe",
      currency: sale.currency.toLowerCase(),
      metadata: JSON.stringify(commission),
      timestamp: new Date(sale.created_at).toISOString(),
    }),

    prisma.link.update({
      where: { id: customerFound.linkId },
      data: {
        sales: { increment: 1 },
        saleAmount: { increment: sale.sale_amount_cents },
      },
    }),
  ]);
}
