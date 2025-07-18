import { prisma } from "@dub/prisma";
import { Program, Reward } from "@dub/prisma/client";
import { nanoid } from "@dub/utils";
import { createId } from "../api/create-id";
import { bulkCreateLinks } from "../api/links";
import { REWARD_EVENT_COLUMN_MAPPING } from "../zod/schemas/rewards";
import { RewardfulApi } from "./api";
import { MAX_BATCHES, rewardfulImporter } from "./importer";
import { RewardfulAffiliate } from "./types";

// Import Rewardful affiliates
export async function importAffiliates({
  programId,
  rewardId,
  page,
}: {
  programId: string;
  rewardId?: string;
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
  let hasMoreAffiliates = true;
  let processedBatches = 0;

  const reward = await prisma.reward.findUniqueOrThrow({
    where: {
      id: rewardId,
    },
    select: {
      id: true,
      event: true,
    },
  });

  while (hasMoreAffiliates && processedBatches < MAX_BATCHES) {
    const affiliates = await rewardfulApi.listAffiliates({
      campaignId,
      page: currentPage,
    });

    if (affiliates.length === 0) {
      hasMoreAffiliates = false;
      break;
    }

    const activeAffiliates = affiliates.filter(
      (affiliate) =>
        // only active affiliates and have more than 1 lead
        affiliate.state === "active" && affiliate.leads > 0,
    );

    if (activeAffiliates.length > 0) {
      await Promise.all(
        activeAffiliates.map((affiliate) =>
          createPartnerAndLinks({
            program,
            affiliate,
            userId,
            reward,
          }),
        ),
      );
    }

    currentPage++;
    processedBatches++;
  }

  const action = hasMoreAffiliates ? "import-affiliates" : "import-referrals";

  await rewardfulImporter.queue({
    programId: program.id,
    action,
    ...(action === "import-affiliates" && rewardId && { rewardId }),
    ...(hasMoreAffiliates ? { page: currentPage } : {}),
  });
}

// Create partner and their links
async function createPartnerAndLinks({
  program,
  affiliate,
  userId,
  reward,
}: {
  program: Program;
  affiliate: RewardfulAffiliate;
  userId: string;
  reward: Pick<Reward, "id" | "event">;
}) {
  const partner = await prisma.partner.upsert({
    where: {
      email: affiliate.email,
    },
    create: {
      id: createId({ prefix: "pn_" }),
      name: `${affiliate.first_name}${affiliate.last_name && affiliate.last_name !== "Unknown" ? ` ${affiliate.last_name}` : ""}`,
      email: affiliate.email,
    },
    update: {},
  });

  const programEnrollment = await prisma.programEnrollment.upsert({
    where: {
      partnerId_programId: {
        partnerId: partner.id,
        programId: program.id,
      },
    },
    create: {
      programId: program.id,
      partnerId: partner.id,
      status: "approved",
      ...(reward && { [REWARD_EVENT_COLUMN_MAPPING[reward.event]]: reward.id }),
    },
    update: {
      status: "approved",
    },
    include: {
      links: true,
    },
  });

  if (!program.domain || !program.url) {
    console.error("Program domain or url not found", program.id);
    return;
  }

  if (programEnrollment.links.length > 0) {
    console.log("Partner already has links", partner.id);
    return;
  }

  await bulkCreateLinks({
    links: affiliate.links.map((link) => ({
      domain: program.domain!,
      key: link.token || nanoid(),
      url: program.url!,
      trackConversion: true,
      programId: program.id,
      partnerId: partner.id,
      folderId: program.defaultFolderId,
      userId,
      projectId: program.workspaceId,
    })),
  });
}
