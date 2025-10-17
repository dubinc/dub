import { prisma } from "@dub/prisma";
import { Program } from "@dub/prisma/client";
import { nanoid } from "@dub/utils";
import { createId } from "../api/create-id";
import { bulkCreateLinks } from "../api/links";
import { logImportError } from "../tinybird/log-import-error";
import { RewardfulApi } from "./api";
import { MAX_BATCHES, rewardfulImporter } from "./importer";
import { RewardfulAffiliate, RewardfulImportPayload } from "./types";

export async function importPartners(payload: RewardfulImportPayload) {
  const { importId, programId, campaignIds, userId, page = 1 } = payload;

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

  const campaignIdToGroupMap = Object.fromEntries(
    program.groups.map((group) => [
      group.slug.replace("rewardful-", ""),
      group.id,
    ]),
  );

  const { token } = await rewardfulImporter.getCredentials(program.workspaceId);

  const rewardfulApi = new RewardfulApi({ token });

  let currentPage = page;
  let hasMore = true;
  let processedBatches = 0;

  const commonImportLogInputs = {
    workspace_id: program.workspaceId,
    import_id: importId,
    source: "rewardful",
    entity: "partner",
  } as const;

  while (hasMore && processedBatches < MAX_BATCHES) {
    const affiliates = await rewardfulApi.listPartners({
      page: currentPage,
    });

    if (affiliates.length === 0) {
      hasMore = false;
      break;
    }

    const activeAffiliates: typeof affiliates = [];
    const notImportedAffiliates: typeof affiliates = [];

    for (const affiliate of affiliates) {
      if (
        affiliate.state === "active" &&
        affiliate.leads > 0 &&
        campaignIds.includes(affiliate.campaign.id)
      ) {
        activeAffiliates.push(affiliate);
      } else {
        notImportedAffiliates.push(affiliate);
      }
    }

    if (activeAffiliates.length > 0) {
      await Promise.all(
        activeAffiliates.map((affiliate) => {
          const groupId = campaignIdToGroupMap[affiliate.campaign.id];
          const group = program.groups.find((group) => group.id === groupId);
          if (!group) {
            console.error(
              `Group not found for campaign ${affiliate.campaign.id}`,
              groupId,
            );
            return;
          }

          return createPartnerAndLinks({
            program,
            affiliate,
            userId,
            defaultGroupAttributes: {
              groupId: group.id,
              saleRewardId: group.saleRewardId,
              leadRewardId: group.leadRewardId,
              clickRewardId: group.clickRewardId,
              discountId: group.discountId,
            },
            partnerGroupDefaultLinkId:
              group.partnerGroupDefaultLinks.length > 0
                ? group.partnerGroupDefaultLinks[0].id
                : null,
          });
        }),
      );
    }

    if (notImportedAffiliates.length > 0) {
      await logImportError(
        notImportedAffiliates.map((affiliate) => ({
          ...commonImportLogInputs,
          entity_id: affiliate.id,
          code: "INACTIVE_PARTNER",
          message: `Partner ${affiliate.email} not imported because it is not active or has no leads or is not in selected campaignIds (${campaignIds.join(", ")}).`,
        })),
      );
    }

    currentPage++;
    processedBatches++;
  }

  const action = hasMore ? "import-partners" : "import-customers";

  await rewardfulImporter.queue({
    ...payload,
    action,
    page: hasMore ? currentPage : undefined,
  });
}

// Create partner and their links
async function createPartnerAndLinks({
  program,
  affiliate,
  userId,
  defaultGroupAttributes,
  partnerGroupDefaultLinkId,
}: {
  program: Program;
  affiliate: RewardfulAffiliate;
  userId: string;
  defaultGroupAttributes: {
    groupId: string;
    saleRewardId: string | null;
    leadRewardId: string | null;
    clickRewardId: string | null;
    discountId: string | null;
  };
  partnerGroupDefaultLinkId?: string | null;
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
      id: createId({ prefix: "pge_" }),
      programId: program.id,
      partnerId: partner.id,
      status: "approved",
      ...defaultGroupAttributes,
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
    links: affiliate.links.map((link, idx) => ({
      domain: program.domain!,
      key: link.token || nanoid(),
      url: program.url!,
      trackConversion: true,
      programId: program.id,
      partnerId: partner.id,
      folderId: program.defaultFolderId,
      userId,
      projectId: program.workspaceId,
      partnerGroupDefaultLinkId: idx === 0 ? partnerGroupDefaultLinkId : null,
    })),
  });
}
