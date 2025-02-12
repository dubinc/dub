import { prisma } from "@dub/prisma";
import { Program, Project } from "@prisma/client";
import { createLink } from "../api/links/create-link";
import { processLink } from "../api/links/process-link";
import { createId } from "../api/utils";
import { WorkspaceProps } from "../types";
import {
  createRewardfulApi,
  fetchRewardfulConfig,
  MAX_BATCHES,
  queueRewardfulImport,
} from "./importer";
import { RewardfulAffiliate } from "./types";

// Import Rewardful affiliates
export async function importAffiliates({
  programId,
  campaignId,
  page,
}: {
  programId: string;
  campaignId: string;
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

  const { userId } = await fetchRewardfulConfig(program.id);

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
            userId,
          }),
        ),
      );
    }

    await new Promise((resolve) => setTimeout(resolve, 2000));
    currentPage++;
    processedBatches++;
  }

  await queueRewardfulImport({
    programId: program.id,
    campaignId,
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

  await Promise.all(
    affiliate.links.map(async (link) => {
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
