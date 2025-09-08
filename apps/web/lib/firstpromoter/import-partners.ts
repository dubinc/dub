import { prisma } from "@dub/prisma";
import { PartnerGroup, Program } from "@dub/prisma/client";
import { nanoid } from "@dub/utils";
import { createId } from "../api/create-id";
import { bulkCreateLinks } from "../api/links";
import { logImportError } from "../tinybird/log-import-error";
import { DEFAULT_PARTNER_GROUP } from "../zod/schemas/groups";
import { FirstPromoterApi } from "./api";
import { firstPromoterImporter, MAX_BATCHES } from "./importer";
import { FirstPromoterImportPayload, FirstPromoterPartner } from "./types";

export async function importPartners(payload: FirstPromoterImportPayload) {
  const { importId, userId, programId, groupId, campaignId, page = 1 } = payload;

  const program = await prisma.program.findUniqueOrThrow({
    where: {
      id: programId,
    },
    include: {
      groups: {
        // if groupId is provided, use it, otherwise use the default group
        where: {
          ...(groupId
            ? {
                id: groupId,
              }
            : {
                slug: DEFAULT_PARTNER_GROUP.slug,
              }),
        },
      },
    },
  });

  const group = program.groups[0];

  const credentials = await firstPromoterImporter.getCredentials(
    program.workspaceId,
  );

  const firstPromoterApi = new FirstPromoterApi(credentials);

  let hasMore = true;
  let processedBatches = 0;
  let currentPage = page;

  const commonImportLogInputs = {
    workspace_id: program.workspaceId,
    import_id: importId,
    source: "firstpromoter",
    entity: "partner",
  } as const;

  while (hasMore && processedBatches < MAX_BATCHES) {
    const affiliates = await firstPromoterApi.listPartners({
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
      if (
        affiliate.state === "accepted" &&
        affiliate.stats.referrals_count > 0
      ) {
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
            group,
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

  await firstPromoterImporter.queue({
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
  group,
}: {
  program: Program;
  affiliate: FirstPromoterPartner;
  userId: string;
  group: Pick<
    PartnerGroup,
    "id" | "clickRewardId" | "leadRewardId" | "saleRewardId" | "discountId"
  >;
}) {
  const partner = await prisma.partner.upsert({
    where: {
      email: affiliate.email,
    },
    create: {
      id: createId({ prefix: "pn_" }),
      name: affiliate.name,
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
