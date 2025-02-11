import { qstash } from "@/lib/cron";
import { redis } from "@/lib/upstash";
import { prisma } from "@dub/prisma";
import { APP_DOMAIN_WITH_NGROK, nanoid } from "@dub/utils";
import { Program, Project } from "@prisma/client";
import { createId } from "../api/utils";
import { recordClick } from "../tinybird/record-click";
import { recordLead } from "../tinybird/record-lead";
import { clickEventSchemaTB } from "../zod/schemas/clicks";
import { RewardfulApi } from "./api";
import { RewardfulReferral } from "./types";

const MAX_BATCHES = 5;
const CACHE_EXPIRY = 60 * 60 * 24;

export function createRewardfulApi(programId: string) {
  return new RewardfulApi({ programId });
}

export async function startRewardfulImport({
  programId,
  apiKey,
  campaignId,
}: {
  programId: string;
  apiKey: string;
  campaignId: string;
}) {
  await redis.set(
    `rewardful:import:${programId}`,
    { apiKey, campaignId },
    { ex: CACHE_EXPIRY },
  );

  return queueNextImport({ programId });
}

export async function queueNextImport(body: {
  programId: string;
  action?: string;
  page?: number;
}) {
  return await qstash.publishJSON({
    url: `${APP_DOMAIN_WITH_NGROK}/api/cron/import/rewardful`,
    body,
  });
}

// Import Rewardful affiliates
export async function importAffiliates({
  programId,
  page,
}: {
  programId: string;
  page: number;
}) {
  const rewardfulApi = createRewardfulApi(programId);

  let currentPage = page;
  let hasMoreAffiliates = true;
  let processedBatches = 0;

  const { workspace, ...program } = await prisma.program.findUniqueOrThrow({
    where: {
      id: programId,
    },
    include: {
      workspace: true,
    },
  });

  while (hasMoreAffiliates && processedBatches < MAX_BATCHES) {
    const affiliates = await rewardfulApi.listAffiliates({
      page: currentPage,
    });

    if (affiliates.length === 0) {
      hasMoreAffiliates = false;
      break;
    }

    const partners = affiliates
      .filter((affiliate) => affiliate.state === "active")
      .map((affiliate) => ({
        name: `${affiliate.first_name} ${affiliate.last_name}`,
        email: affiliate.email,
      }));

    if (partners.length > 0) {
      await Promise.all(
        partners.map((partner) =>
          prisma.partner.create({
            data: {
              id: createId({ prefix: "pn_" }),
              name: partner.name,
              email: partner.email,
              showOnLeaderboard: false,
              programs: {
                create: {
                  programId: program.id,
                  status: "approved",
                },
              },
            },
          }),
        ),
      );
    }

    await new Promise((resolve) => setTimeout(resolve, 2000));
    currentPage++;
    processedBatches++;
  }

  await queueNextImport({
    action: hasMoreAffiliates ? "import-affiliates" : "import-affiliates-links",
    programId: program.id,
    page: currentPage,
  });

  return { lastProcessedPage: currentPage - 1 };
}

export async function importReferrals({
  programId,
  page,
}: {
  programId: string;
  page: number;
}) {
  let currentPage = page;
  let hasMoreReferrals = true;
  let processedBatches = 0;
  const rewardfulApi = createRewardfulApi(programId);

  const { workspace, ...program } = await prisma.program.findUniqueOrThrow({
    where: {
      id: programId,
    },
    include: {
      workspace: true,
    },
  });

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
        }),
      ),
    );

    await new Promise((resolve) => setTimeout(resolve, 2000));
    currentPage++;
    processedBatches++;
  }

  if (hasMoreReferrals) {
    await queueNextImport({
      action: "import-referrals",
      programId: program.id,
      page: currentPage,
    });
  }
}

// Create individual referral entries
export async function createReferral({
  referral,
  workspace,
  program,
}: {
  referral: RewardfulReferral;
  workspace: Project;
  program: Program;
}) {
  const link = await prisma.link.findFirst({
    where: {
      id: "link_0ntBrVm4VqPSpcLaLTbNAV5y", // TODO: Update with proper query
      // key: referral.link.token,
      // domain: program.domain!,
      // programId: program.id,
    },
  });

  if (!link) {
    console.log("Link not found", referral.link.token);
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
    workspaceId: workspace.id,
    timestamp: new Date(referral.created_at).toISOString(),
    skipRatelimit: true,
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
        name: referral.customer.name,
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

    recordLead({
      ...clickEvent,
      event_id: nanoid(16),
      event_name: "Sign up",
      customer_id: customerId,
    }),

    prisma.link.update({
      where: { id: link.id },
      data: { leads: { increment: 1 } },
    }),

    prisma.project.update({
      where: { id: workspace.id },
      data: { usage: { increment: 1 } },
    }),
  ]);
}
