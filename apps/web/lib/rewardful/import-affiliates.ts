import { prisma } from "@dub/prisma";
import { Program, Project } from "@dub/prisma/client";
import { nanoid } from "@dub/utils";
import { bulkCreateLinks } from "../api/links";
import { createId } from "../api/utils";
import { RewardfulApi } from "./api";
import { MAX_BATCHES, rewardfulImporter } from "./importer";
import { RewardfulAffiliate } from "./types";

// Import Rewardful affiliates
export async function importAffiliates({
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
      campaignId,
      page: currentPage,
    });

    if (affiliates.length === 0) {
      hasMoreAffiliates = false;
      break;
    }

    const activeAffiliates = affiliates.filter(
      (affiliate) =>
        // only active affiliates
        affiliate.state === "active" &&
        // have more than 1 lead or joined in the last 6 months
        (affiliate.leads > 0 ||
          new Date(affiliate.created_at) >
            new Date(Date.now() - 6 * 30 * 24 * 60 * 60 * 1000)),
    );

    if (activeAffiliates.length > 0) {
      await Promise.all(
        activeAffiliates.map((affiliate) =>
          createPartnerAndLinks({
            workspace,
            program,
            affiliate,
            userId,
          }),
        ),
      );
    }

    await new Promise((resolve) => setTimeout(resolve, 2000));
    currentPage++;
    processedBatches++;
  }

  await rewardfulImporter.queue({
    programId: program.id,
    action: hasMoreAffiliates ? "import-affiliates" : "import-referrals",
    ...(hasMoreAffiliates ? { page: currentPage } : {}),
  });
}

// Create partner and their links
async function createPartnerAndLinks({
  workspace,
  program,
  affiliate,
  userId,
}: {
  workspace: Project;
  program: Program;
  affiliate: RewardfulAffiliate;
  userId: string;
}) {
  const partner = await prisma.partner.upsert({
    where: {
      email: affiliate.email,
    },
    create: {
      id: createId({ prefix: "pn_" }),
      name: `${affiliate.first_name} ${affiliate.last_name}`,
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
      projectId: workspace.id,
    })),
  });
}
