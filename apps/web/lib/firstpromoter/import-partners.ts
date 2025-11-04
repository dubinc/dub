import { prisma } from "@dub/prisma";
import {
  PartnerGroup,
  PartnerGroupDefaultLink,
  Program,
} from "@dub/prisma/client";
import { isRejected, nanoid } from "@dub/utils";
import { createId } from "../api/create-id";
import { bulkCreateLinks } from "../api/links";
import { DEFAULT_PARTNER_GROUP } from "../zod/schemas/groups";
import { FirstPromoterApi } from "./api";
import { firstPromoterImporter, MAX_BATCHES } from "./importer";
import { FirstPromoterImportPayload, FirstPromoterPartner } from "./types";

export async function importPartners(payload: FirstPromoterImportPayload) {
  const { userId, programId, page = 1 } = payload;

  const program = await prisma.program.findUniqueOrThrow({
    where: {
      id: programId,
    },
    include: {
      groups: {
        include: {
          partnerGroupDefaultLinks: true,
        },
      },
    },
  });

  const { groups } = program;

  // Default group will always be created in the program creation
  const defaultGroup = groups.find(
    (group) => group.slug === DEFAULT_PARTNER_GROUP.slug,
  )!;

  const credentials = await firstPromoterImporter.getCredentials(
    program.workspaceId,
  );

  const firstPromoterApi = new FirstPromoterApi(credentials);

  let hasMore = true;
  let processedBatches = 0;
  let currentPage = page;

  while (processedBatches < MAX_BATCHES) {
    const affiliates = await firstPromoterApi.listPartners({
      page: currentPage,
    });

    if (affiliates.length === 0) {
      hasMore = false;
      break;
    }

    const campaignMap = Object.fromEntries(
      groups.map((group) => [group.name, group]),
    );

    if (affiliates.length > 0) {
      const results = await Promise.allSettled(
        affiliates.map((affiliate) => {
          const promoterCampaigns = affiliate.promoter_campaigns;

          const group =
            promoterCampaigns.length > 0
              ? campaignMap[promoterCampaigns[0].campaign.name] ?? defaultGroup
              : defaultGroup;

          return createPartnerAndLinks({
            program,
            affiliate,
            group,
            userId,
          });
        }),
      );

      // Log any errors that occurred
      results.forEach((result, index) => {
        if (isRejected(result)) {
          console.error(
            `Failed to import affiliate ${affiliates[index]?.email}:`,
            result.reason,
          );
        }
      });
    }

    currentPage++;
    processedBatches++;
  }

  await firstPromoterImporter.queue({
    ...payload,
    action: hasMore ? "import-partners" : "import-customers",
    page: hasMore ? currentPage : undefined,
  });
}

// Create partner and their links
async function createPartnerAndLinks({
  program,
  affiliate,
  group,
  userId,
}: {
  program: Program;
  affiliate: FirstPromoterPartner;
  group: PartnerGroup & { partnerGroupDefaultLinks: PartnerGroupDefaultLink[] };
  userId: string;
}) {
  const partner = await prisma.partner.upsert({
    where: {
      email: affiliate.email,
    },
    create: {
      id: createId({ prefix: "pn_" }),
      name: affiliate.name,
      email: affiliate.email,
      image: affiliate.profile.avatar,
      description: affiliate.profile.description,
      country: affiliate.profile.country,
      website: affiliate.profile.website,
      youtube: affiliate.profile.youtube_url,
      twitter: affiliate.profile.twitter_url,
      linkedin: affiliate.profile.linkedin_url,
      instagram: affiliate.profile.instagram_url,
      tiktok: affiliate.profile.tiktok_url,
      companyName: affiliate.profile.company_name,
      invoiceSettings: {
        ...(affiliate.profile.address && {
          address: affiliate.profile.address,
        }),
      },
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
      id: createId({ prefix: "pge_" }),
      programId: program.id,
      partnerId: partner.id,
      status: "approved",
      groupId: group.id,
      clickRewardId: group.clickRewardId,
      leadRewardId: group.leadRewardId,
      saleRewardId: group.saleRewardId,
      discountId: group.discountId,
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

  const links = affiliate.promoter_campaigns.map((campaign, idx) => ({
    key: campaign.ref_token || nanoid(),
    domain: program.domain!,
    url: program.url!,
    programId: program.id,
    projectId: program.workspaceId,
    folderId: program.defaultFolderId,
    partnerId: partner.id,
    trackConversion: true,
    userId,
    partnerGroupDefaultLinkId:
      idx === 0 ? group.partnerGroupDefaultLinks[0]?.id ?? null : null,
  }));

  await bulkCreateLinks({
    links,
  });
}
