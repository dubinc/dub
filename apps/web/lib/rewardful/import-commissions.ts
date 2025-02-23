import { sendEmail } from "@dub/email";
import { CampaignImported } from "@dub/email/templates/campaign-imported";
import { prisma } from "@dub/prisma";
import { Program, Project } from "@prisma/client";
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

  const customerFound = await prisma.customer.findUnique({
    where: {
      stripeCustomerId: sale.referral.stripe_customer_id,
    },
  });

  if (!customerFound) {
    console.log(
      `No customer found for Stripe customer ID ${sale.referral.stripe_customer_id}, skipping...`,
    );
    return;
  }

  await Promise.all([
    // recordSaleWithTimestamp({
    //   ...clickEvent,
    //   event_id: nanoid(16),
    //   event_name: "Sign up",
    //   customer_id: customerId,
    //   timestamp: new Date(referral.became_lead_at).toISOString(),
    // }),
    // prisma.link.update({
    //   where: { id: link.id },
    //   data: { leads: { increment: 1 } },
    // }),
    // prisma.project.update({
    //   where: { id: workspace.id },
    //   data: { usage: { increment: 1 } },
    // }),
  ]);
}
