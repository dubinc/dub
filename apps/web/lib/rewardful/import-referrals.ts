import { prisma } from "@dub/prisma";
import { nanoid } from "@dub/utils";
import { Program, Project } from "@prisma/client";
import { createId } from "../api/create-id";
import { recordClick } from "../tinybird/record-click";
import { recordLeadWithTimestamp } from "../tinybird/record-lead";
import { clickEventSchemaTB } from "../zod/schemas/clicks";
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

    await new Promise((resolve) => setTimeout(resolve, 2000));
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

  const customerFound = await prisma.customer.findUnique({
    where: {
      stripeCustomerId: referral.stripe_customer_id,
    },
  });

  if (customerFound) {
    console.log(
      `A customer already exists with Stripe customer ID ${referral.stripe_customer_id}`,
    );
    return;
  }

  const dummyRequest = new Request(link.url, {
    headers: new Headers({
      "user-agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)",
      "x-forwarded-for": "127.0.0.1",
      "x-vercel-ip-country": "US",
      "x-vercel-ip-country-region": "CA",
      "x-vercel-ip-continent": "NA",
    }),
  });

  const clickData = await recordClick({
    req: dummyRequest,
    linkId: link.id,
    clickId: nanoid(16),
    url: link.url,
    domain: link.domain,
    key: link.key,
    workspaceId: workspace.id,
    skipRatelimit: true,
    timestamp: new Date(referral.created_at).toISOString(),
  });

  const clickEvent = clickEventSchemaTB.parse({
    ...clickData,
    bot: 0,
    qr: 0,
  });

  const customerId = createId({ prefix: "cus_" });

  await Promise.all([
    prisma.customer.create({
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
    }),

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
