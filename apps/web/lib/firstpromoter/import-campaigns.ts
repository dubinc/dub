import { RESOURCE_COLORS } from "@/ui/colors";
import { prisma } from "@dub/prisma";
import { randomValue } from "@dub/utils";
import slugify from "@sindresorhus/slugify";
import { createId } from "../api/create-id";
import { FirstPromoterApi } from "./api";
import { firstPromoterImporter, MAX_BATCHES } from "./importer";
import { FirstPromoterImportPayload } from "./types";

export async function importCampaigns(payload: FirstPromoterImportPayload) {
  const { programId, page = 1 } = payload;

  // Find the program and their groups
  const program = await prisma.program.findUniqueOrThrow({
    where: {
      id: programId,
    },
    include: {
      groups: true,
    },
  });

  // Groups in the program
  const existingGroupNames = program.groups.map((group) => group.name);

  const credentials = await firstPromoterImporter.getCredentials(
    program.workspaceId,
  );

  const firstPromoterApi = new FirstPromoterApi(credentials);

  let hasMore = true;
  let processedBatches = 0;
  let currentPage = page;

  while (processedBatches < MAX_BATCHES) {
    const campaigns = await firstPromoterApi.listCampaigns({
      page: currentPage,
    });

    if (campaigns.length === 0) {
      hasMore = false;
      break;
    }

    // Find the campaigns that don't exist in the program
    // We compare the group name with the campaign name
    const newCampaigns = campaigns.filter(
      (campaign) => !existingGroupNames.includes(campaign.campaign.name),
    );

    if (newCampaigns.length > 0) {
      const groups = await prisma.partnerGroup.createMany({
        data: newCampaigns.map((campaign) => ({
          id: createId({ prefix: "grp_" }),
          programId: program.id,
          slug: slugify(campaign.campaign.name),
          name: campaign.campaign.name,
          color: randomValue(RESOURCE_COLORS),
        })),
        skipDuplicates: true,
      });

      console.log(`Created ${groups.count} partner groups`);
    }

    currentPage++;
    processedBatches++;
  }

  await firstPromoterImporter.queue({
    ...payload,
    action: hasMore ? "import-campaigns" : "import-partners",
    page: hasMore ? currentPage : undefined,
  });
}
