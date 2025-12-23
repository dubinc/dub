import { RESOURCE_COLORS } from "@/ui/colors";
import { prisma } from "@dub/prisma";
import { randomValue } from "@dub/utils";
import slugify from "@sindresorhus/slugify";
import { createId } from "../api/create-id";
import { DEFAULT_PARTNER_GROUP } from "../zod/schemas/groups";
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

  if (!program.domain || !program.url) {
    console.error(
      `domain or url not found for program ${program.id}. Skipping the import..`,
    );
    return;
  }

  // Groups in the program
  const existingGroupNames = program.groups.map((group) => group.name);

  const defaultGroup = program.groups.find(
    (group) => group.slug === DEFAULT_PARTNER_GROUP.slug,
  );

  const {
    logo,
    wordmark,
    brandColor,
    holdingPeriodDays,
    autoApprovePartnersEnabledAt,
    additionalLinks,
    maxPartnerLinks,
    linkStructure,
    applicationFormData,
    landerData,
  } = defaultGroup ?? {};

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
          // Use default group settings for new groups
          logo,
          wordmark,
          brandColor,
          holdingPeriodDays,
          autoApprovePartnersEnabledAt,
          ...(additionalLinks && { additionalLinks }),
          ...(maxPartnerLinks && { maxPartnerLinks }),
          ...(linkStructure && { linkStructure }),
          ...(applicationFormData && { applicationFormData }),
          ...(landerData && { landerData }),
        })),
        skipDuplicates: true,
      });

      console.log(
        `Created ${groups.count} new groups for ${program.id}: ${newCampaigns.map(({ campaign }) => campaign.name).join(", ")}`,
      );
    }

    // Create default links for groups without default links
    const groupsWithoutDefaultLinks = await prisma.partnerGroup.findMany({
      where: {
        programId: program.id,
        partnerGroupDefaultLinks: {
          none: {},
        },
      },
    });

    if (groupsWithoutDefaultLinks.length > 0) {
      await prisma.partnerGroupDefaultLink.createMany({
        data: groupsWithoutDefaultLinks.map((group) => ({
          id: createId({ prefix: "pgdl_" }),
          groupId: group.id,
          programId: program.id,
          domain: program.domain!,
          url: program.url!,
        })),
      });
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
