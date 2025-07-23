import { prisma } from "@dub/prisma";
import { nanoid } from "@dub/utils";
import { Program, Project } from "@prisma/client";
import { createId } from "../api/create-id";
import { recordFakeClick } from "../tinybird/record-fake-click";
import { recordLeadWithTimestamp } from "../tinybird/record-lead";
import { RewardfulApi } from "./api";
import { MAX_BATCHES, rewardfulImporter } from "./importer";
import { RewardfulReferral } from "./types";

export async function importReferrals({
  programId,
  page,
}: {
  programId: string;
  page: number;
}) {
  const { workspace, ...program } = await prisma.program.findUniqueOrThrow({
    where: {
      id: programId,
    },
    include: {
      workspace: true,
    },
  });

  const { token, campaignId } = await rewardfulImporter.getCredentials(
    workspace.id,
  );

  const rewardfulApi = new RewardfulApi({ token });

  let currentPage = page;
  let hasMoreReferrals = true;
  let processedBatches = 0;

  while (hasMoreReferrals && processedBatches < MAX_BATCHES) {
    const referrals = await rewardfulApi.listReferrals({
      page: currentPage,
    });

    if (referrals.length === 0) {
      hasMoreReferrals = false;
      break;
    }

    await Promise.all(
      referrals.map((referral) =>
        createReferral({
          referral,
          workspace,
          program,
          campaignId,
        }),
      ),
    );

    currentPage++;
    processedBatches++;
  }

  if (hasMoreReferrals) {
    return await rewardfulImporter.queue({
      programId: program.id,
      action: "import-referrals",
      page: currentPage,
    });
  }

  await rewardfulImporter.queue({
    programId: program.id,
    action: "import-commissions",
  });
}

// Create individual referral entries
async function createReferral({
  referral,
  workspace,
  program,
  campaignId,
}: {
  referral: RewardfulReferral;
  workspace: Project;
  program: Program;
  campaignId: string;
}) {
  const referralId = referral.customer ? referral.customer.email : referral.id;
  if (
    referral.affiliate?.campaign?.id &&
    referral.affiliate.campaign.id !== campaignId
  ) {
    console.log(
      `Referral ${referralId} not in campaign ${campaignId} (they're in ${referral.affiliate.campaign.id}). Skipping...`,
    );
    return;
  }

  const link = await prisma.link.findUnique({
    where: {
      domain_key: {
        domain: program.domain!,
        key: referral.link.token,
      },
    },
  });

  if (!link) {
    console.log(
      `Link not found for referral ${referralId} (token: ${referral.link.token}), skipping...`,
    );
    return;
  }

  if (
    !referral.stripe_customer_id ||
    !referral.stripe_customer_id.startsWith("cus_")
  ) {
    console.log(
      `No Stripe customer ID provided for referral ${referralId}, skipping...`,
    );
    return;
  }

  const customerFoundStripeId = await prisma.customer.findUnique({
    where: {
      stripeCustomerId: referral.stripe_customer_id,
    },
  });

  if (customerFoundStripeId) {
    console.log(
      `A customer already exists with Stripe customer ID ${referral.stripe_customer_id}`,
    );
    return;
  }

  const customerFoundExternalId = await prisma.customer.findUnique({
    where: {
      projectId_externalId: {
        projectId: workspace.id,
        externalId: referral.customer.id,
      },
    },
  });

  if (customerFoundExternalId) {
    console.log(
      `A customer already exists with external ID ${referral.customer.id}`,
    );
    return;
  }

  const clickEvent = await recordFakeClick({
    link,
    timestamp: referral.created_at,
  });

  const customerId = createId({ prefix: "cus_" });

  await prisma.customer.create({
    data: {
      id: customerId,
      name:
        // if name is null/undefined or starts with cus_, use email as name
        !referral.customer.name || referral.customer.name.startsWith("cus_")
          ? referral.customer.email
          : referral.customer.name,
      email: referral.customer.email,
      projectId: workspace.id,
      projectConnectId: workspace.stripeConnectId,
      clickId: clickEvent.click_id,
      linkId: link.id,
      country: clickEvent.country,
      clickedAt: new Date(referral.created_at),
      createdAt: new Date(referral.became_lead_at),
      externalId: referral.customer.id,
      stripeCustomerId: referral.stripe_customer_id,
    },
  });

  await Promise.all([
    recordLeadWithTimestamp({
      ...clickEvent,
      event_id: nanoid(16),
      event_name: "Sign up",
      customer_id: customerId,
      timestamp: new Date(referral.became_lead_at).toISOString(),
    }),

    prisma.link.update({
      where: { id: link.id },
      data: { leads: { increment: 1 } },
    }),
  ]);
}
