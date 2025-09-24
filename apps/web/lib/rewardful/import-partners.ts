import { prisma } from "@dub/prisma";
import { Program } from "@dub/prisma/client";
import { nanoid } from "@dub/utils";
import { createId } from "../api/create-id";
import { bulkCreateLinks } from "../api/links";
import { logImportError } from "../tinybird/log-import-error";
import { DEFAULT_PARTNER_GROUP } from "../zod/schemas/groups";
import { RewardfulApi } from "./api";
import { MAX_BATCHES, rewardfulImporter } from "./importer";
import { RewardfulAffiliate, RewardfulImportPayload } from "./types";

export async function importPartners(payload: RewardfulImportPayload) {
  const {
    importId,
    programId,
    groupId,
    userId,
    campaignId,
    page = 1,
  } = payload;

  const program = await prisma.program.findUniqueOrThrow({
    where: {
      id: programId,
    },
    include: {
      groups: {
        // if groupId is provided, use it, otherwise use the default group
        where: {
          ...(groupId ? { id: groupId } : { slug: DEFAULT_PARTNER_GROUP.slug }),
        },
        include: {
          partnerGroupDefaultLinks: true,
        },
      },
    },
  });

  const defaultGroup = program.groups[0];

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
            defaultGroupAttributes: {
              groupId: defaultGroup.id,
              saleRewardId: defaultGroup.saleRewardId,
              leadRewardId: defaultGroup.leadRewardId,
              clickRewardId: defaultGroup.clickRewardId,
              discountId: defaultGroup.discountId,
              partnerGroupDefaultLinkId:
                defaultGroup.partnerGroupDefaultLinks[0].id,
            },
          }),
        ),
      );
    }

    if (notImportedAffiliates.length > 0) {
      await logImportError(
        notImportedAffiliates.map((affiliate) => ({
          ...commonImportLogInputs,
          entity_id: affiliate.id,
          code: "INACTIVE_PARTNER",
          message: `Partner ${affiliate.email} not imported because it is not active or has no leads.`,
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
    ...(action === "import-partners" && groupId && { groupId }),
    page: hasMore ? currentPage : undefined,
  });
}

// Create partner and their links
async function createPartnerAndLinks({
  program,
  affiliate,
  userId,
  defaultGroupAttributes,
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
    partnerGroupDefaultLinkId: string | null;
  };
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
      partnerGroupDefaultLinkId:
        idx === 0 ? defaultGroupAttributes.partnerGroupDefaultLinkId : null,
    })),
  });
}
