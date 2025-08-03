import { prisma } from "@dub/prisma";
import { Program, Reward } from "@dub/prisma/client";
import { nanoid } from "@dub/utils";
import { createId } from "../api/create-id";
import { bulkCreateLinks } from "../api/links";
import { recordProgramImportLog } from "../tinybird/record-program-import-log";
import { ProgramImportLogInput } from "../types";
import { REWARD_EVENT_COLUMN_MAPPING } from "../zod/schemas/rewards";
import { RewardfulApi } from "./api";
import { MAX_BATCHES, rewardfulImporter } from "./importer";
import { RewardfulAffiliate, RewardfulImportPayload } from "./types";

export async function importPartners(payload: RewardfulImportPayload) {
  const {
    importId,
    programId,
    userId,
    campaignId,
    page = 1,
    rewardId,
  } = payload;

  const program = await prisma.program.findUniqueOrThrow({
    where: {
      id: programId,
    },
  });

  const { token } = await rewardfulImporter.getCredentials(program.workspaceId);

  const rewardfulApi = new RewardfulApi({ token });

  let currentPage = page;
  let hasMore = true;
  let processedBatches = 0;
  const importLogs: ProgramImportLogInput[] = [];

  const reward = await prisma.reward.findUniqueOrThrow({
    where: {
      id: rewardId,
    },
    select: {
      id: true,
      event: true,
    },
  });

  while (hasMore && processedBatches < MAX_BATCHES) {
    const affiliates = await rewardfulApi.listPartners({
      campaignId,
      page: currentPage,
    });

    if (affiliates.length === 0) {
      hasMore = false;
      break;
    }

    const activeAffiliates: typeof affiliates = [];
    const notImportedAffiliates: typeof affiliates = [];

    for (const affiliate of affiliates) {
      if (affiliate.state === "active" && affiliate.leads > 0) {
        activeAffiliates.push(affiliate);
      } else {
        notImportedAffiliates.push(affiliate);
      }
    }

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

    if (notImportedAffiliates.length > 0) {
      for (const affiliate of notImportedAffiliates) {
        importLogs.push({
          entity: "partner",
          entity_id: affiliate.id,
          code: "PARTNER_NOT_IMPORTED",
          message: `Partner ${affiliate.email} not imported because it is not active or has no leads.`,
        });
      }
    }

    currentPage++;
    processedBatches++;
  }

  await recordProgramImportLog(
    importLogs.map((log) => ({
      ...log,
      workspace_id: program.workspaceId,
      import_id: importId,
      source: "rewardful",
    })),
  );

  const action = hasMore ? "import-partners" : "import-customers";

  await rewardfulImporter.queue({
    ...payload,
    action,
    ...(action === "import-partners" && rewardId && { rewardId }),
    page: hasMore ? currentPage : undefined,
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
