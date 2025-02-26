import { sendEmail } from "@dub/email";
import { CampaignImported } from "@dub/email/templates/campaign-imported";
import { prisma } from "@dub/prisma";
import { nanoid } from "@dub/utils";
import { Program, Project } from "@prisma/client";
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
  const { token, userId, campaignId } =
    await rewardfulImporter.getCredentials(programId);

  const rewardfulApi = new RewardfulApi({ token });

  let currentPage = page;
  let hasMoreCommissions = true;
  let processedBatches = 0;

  const { workspace, ...program } = await prisma.program.findUniqueOrThrow({
    where: {
      id: programId,
    },
    include: {
      workspace: true,
    },
  });

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
          workspace,
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
  await rewardfulImporter.deleteCredentials(programId);

  const { email } = await prisma.user.findUniqueOrThrow({
    where: {
      id: userId,
    },
  });

  if (email) {
    await sendEmail({
      email,
      subject: "Rewardful campaign imported",
      react: CampaignImported({
        email,
        provider: "Rewardful",
        workspace,
        program,
      }),
    });
  }
}

// Backfill historical commissions
async function createCommission({
  commission,
  workspace,
  program,
  campaignId,
}: {
  commission: RewardfulCommission;
  workspace: Project;
  program: Program;
  campaignId: string;
}) {
  if (commission.campaign.id !== campaignId) {
    console.log(
      `Commission ${commission.id} not in campaign ${campaignId} (they're in ${commission.campaign.id}). Skipping...`,
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

  const commissionExists = await prisma.commission.findUnique({
    where: {
      programId_invoiceId: {
        programId: program.id,
        invoiceId: sale.id,
      },
    },
  });

  if (commissionExists) {
    console.log(`Commission ${commission.id} already exists, skipping...`);
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

  await Promise.all([
    prisma.commission.create({
      data: {
        eventId,
        type: "sale",
        programId: program.id,
        partnerId: customerFound.link.partnerId,
        linkId: customerFound.linkId,
        customerId: customerFound.id,
        amount: sale.sale_amount_cents,
        currency: sale.currency.toLowerCase(),
        quantity: 1,
        status: "paid",
        invoiceId: sale.id, // this is not the actual invoice ID, but we use this to deduplicate the sales
        createdAt: new Date(sale.created_at),
      },
    }),

    recordSaleWithTimestamp({
      ...clickData,
      event_id: eventId,
      event_name: "Purchase",
      amount: sale.sale_amount_cents,
      customer_id: customerFound.id,
      payment_processor: "stripe",
      currency: sale.currency.toLowerCase(),
      timestamp: new Date(sale.created_at).toISOString(),
      metadata: JSON.stringify(commission),
    }),

    prisma.link.update({
      where: { id: customerFound.linkId },
      data: {
        sales: { increment: 1 },
        saleAmount: { increment: sale.sale_amount_cents },
      },
    }),

    prisma.project.update({
      where: { id: workspace.id },
      data: {
        usage: { increment: 1 },
        salesUsage: { increment: sale.sale_amount_cents },
      },
    }),
  ]);
}
