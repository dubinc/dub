import { qstash } from "@/lib/cron";
import { redis } from "@/lib/upstash";
import { prisma } from "@dub/prisma";
import { APP_DOMAIN_WITH_NGROK, nanoid } from "@dub/utils";
import { Program, Project } from "@prisma/client";
import { z } from "zod";
import { createLink } from "../api/links/create-link";
import { processLink } from "../api/links/process-link";
import { createId } from "../api/utils";
import { recordClick } from "../tinybird/record-click";
import { recordLead } from "../tinybird/record-lead";
import { WorkspaceProps } from "../types";
import { clickEventSchemaTB } from "../zod/schemas/clicks";
import { RewardfulApi } from "./api";
import {
  RewardfulAffiliate,
  RewardfulConfig,
  RewardfulReferral,
} from "./types";

const MAX_BATCHES = 5;
const CACHE_EXPIRY = 60 * 60 * 24;
const CACHE_KEY_PREFIX = "rewardful:import";

export const ImportSteps = z.enum(["import-affiliates", "import-referrals"]);

export function createRewardfulApi(programId: string) {
  return new RewardfulApi({ programId });
}

export async function setRewardfulConfig({
  programId,
  userId,
  token,
}: {
  programId: string;
  userId: string;
  token: string;
}) {
  await redis.set(
    `${CACHE_KEY_PREFIX}:${programId}`,
    {
      token,
      userId,
    },
    {
      ex: CACHE_EXPIRY,
    },
  );
}

export async function fetchRewardfulConfig(programId: string) {
  return await redis.get<RewardfulConfig>(`${CACHE_KEY_PREFIX}:${programId}`);
}

export async function startRewardfulImport({
  programId,
  apiKey,
  campaignId,
  userId,
}: {
  programId: string;
  apiKey: string;
  campaignId: string;
  userId: string;
}) {
  await redis.set(
    `rewardful:import:${programId}`,
    {
      apiKey,
      campaignId,
      userId,
    },
    {
      ex: CACHE_EXPIRY,
    },
  );

  return queueNextImport({ programId });
}

async function queueNextImport(body: {
  programId: string;
  action?: z.infer<typeof ImportSteps>;
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

    const activeAffiliates = affiliates.filter(
      (affiliate) => affiliate.state === "active",
    );

    if (activeAffiliates.length > 0) {
      await Promise.all(
        activeAffiliates.map((affiliate) =>
          createPartnerAndLinks({
            workspace,
            program,
            affiliate,
          }),
        ),
      );
    }

    await new Promise((resolve) => setTimeout(resolve, 2000));
    currentPage++;
    processedBatches++;
  }

  await queueNextImport({
    programId: program.id,
    action: hasMoreAffiliates ? "import-affiliates" : "import-referrals",
    ...(hasMoreAffiliates ? { page: currentPage } : {}),
  });

  return { lastProcessedPage: currentPage - 1 };
}

// Create partner and their links
async function createPartnerAndLinks({
  workspace,
  program,
  affiliate,
}: {
  workspace: Project;
  program: Program;
  affiliate: RewardfulAffiliate;
}) {
  const partner = await prisma.partner.create({
    data: {
      id: createId({ prefix: "pn_" }),
      name: `${affiliate.first_name} ${affiliate.last_name}`,
      email: affiliate.email,
      bio: "Rewardful affiliate",
      programs: {
        create: {
          programId: program.id,
          status: "approved",
        },
      },
    },
  });

  if (!program.domain || !program.url) {
    console.error("Program domain or url not found", program.id);
    return;
  }

  const { userId } = await fetchRewardfulConfig(program.id);

  const links = affiliate.links;

  await Promise.all(
    links.map(async (link) => {
      try {
        const { link: newLink, error } = await processLink({
          payload: {
            url: link.url || program.url!,
            key: link.token || undefined,
            domain: program.domain!,
            programId: program.id,
            partnerId: partner.id,
            trackConversion: true,
            folderId: program.defaultFolderId,
          },
          userId,
          skipProgramChecks: true,
          workspace: workspace as WorkspaceProps,
        });

        if (error != null) {
          console.error("Error creating link", error);
          return;
        }

        const partnerLink = await createLink(newLink);
        console.log("Partner link created", partnerLink);
      } catch (error) {
        console.error("Error processing link:", error);
      }
    }),
  );
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
async function createReferral({
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
      // id: "link_0ntBrVm4VqPSpcLaLTbNAV5y", // TODO: Update with proper query
      key: referral.link.token,
      domain: program.domain!,
      programId: program.id,
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
