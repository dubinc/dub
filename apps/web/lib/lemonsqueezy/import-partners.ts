import { prisma } from "@/lib/prisma";
import { PartnerGroup, Program } from "@prisma/client";
import { createId } from "../api/create-id";
import { queuePartnerSearchSync } from "../api/partners/queue-partner-search-sync";
import { createLink } from "../api/links";
import { generatePartnerLink } from "../api/partners/generate-partner-link";
import { logImportError } from "../tinybird/log-import-error";
import { WorkspaceProps } from "../types";
import { DEFAULT_PARTNER_GROUP } from "../zod/schemas/groups";
import { LemonSqueezyClient } from "./client";
import { LEMONSQUEEZY_MAX_BATCHES, lemonSqueezyImporter } from "./importer";
import { LemonSqueezyAffiliate, LemonSqueezyImportPayload } from "./types";

export async function importPartners(payload: LemonSqueezyImportPayload) {
  const { importId, programId, storeId, userId, page = 1 } = payload;

  const program = await prisma.program.findUnique({
    where: {
      id: programId,
    },
    select: {
      id: true,
      name: true,
      domain: true,
      url: true,
      workspaceId: true,
      defaultFolderId: true,
      groups: {
        select: {
          id: true,
          slug: true,
          clickRewardId: true,
          leadRewardId: true,
          saleRewardId: true,
          referralRewardId: true,
          customRewardId: true,
          discountId: true,
        },
      },
      workspace: {
        select: {
          id: true,
          plan: true,
        },
      },
    },
  });

  if (!program) {
    console.error(`Program ${programId} not found.`);
    return;
  }

  if (!program.domain || !program.url) {
    console.error("Program domain or url not found", program.id);
    return;
  }

  const defaultGroup = program.groups.find(
    (group) => group.slug === DEFAULT_PARTNER_GROUP.slug,
  );

  if (!defaultGroup) {
    console.error(`Default group not found for program ${programId}.`);
    return;
  }

  const workspace = program.workspace as WorkspaceProps;

  const { apiKey } = await lemonSqueezyImporter.getCredentials(workspace.id);
  const lemonSqueezyApi = new LemonSqueezyClient({ apiKey });

  let currentPage = page;
  let hasMore = true;
  let processedBatches = 0;

  const commonImportLogInputs = {
    workspace_id: program.workspaceId,
    import_id: importId,
    source: "lemonsqueezy" as const,
    entity: "partner" as const,
  };

  while (hasMore && processedBatches < LEMONSQUEEZY_MAX_BATCHES) {
    const affiliates = await lemonSqueezyApi.listAffiliates({
      storeId,
      page: currentPage,
    });

    if (affiliates.length === 0) {
      hasMore = false;
      break;
    }

    const activeAffiliates: LemonSqueezyAffiliate[] = [];
    const notImportedAffiliates: LemonSqueezyAffiliate[] = [];

    for (const affiliate of affiliates) {
      // LS has no leads count on affiliates. Import all active partners;
      // pending/disabled are skipped. Customer/commission steps only
      // attach referred activity.
      if (affiliate.status === "active") {
        activeAffiliates.push(affiliate);
      } else {
        notImportedAffiliates.push(affiliate);
      }
    }

    if (activeAffiliates.length > 0) {
      const results = await Promise.allSettled(
        activeAffiliates.map((affiliate) =>
          createPartnerAndLinks({
            workspace,
            program,
            affiliate,
            group: defaultGroup,
            userId,
            importId,
          }),
        ),
      );

      const failures = results.flatMap((result, index) =>
        result.status === "rejected"
          ? [{ affiliate: activeAffiliates[index], reason: result.reason }]
          : [],
      );

      if (failures.length > 0) {
        await logImportError(
          failures.map(({ affiliate, reason }) => ({
            ...commonImportLogInputs,
            entity_id: affiliate.id,
            code: "PARTNER_NOT_FOUND" as const,
            message: `Failed to import affiliate ${affiliate.id}: ${
              reason instanceof Error ? reason.message : String(reason)
            }`,
          })),
        );
      }

      // Queue an index update because the imported partners were enrolled.
      // Queued per page rather than per partner.
      await queuePartnerSearchSync({
        partnerIds: results.flatMap((result) =>
          result.status === "fulfilled" && result.value ? [result.value] : [],
        ),
        programId: program.id,
      });
    }

    if (notImportedAffiliates.length > 0) {
      await logImportError(
        notImportedAffiliates.map((affiliate) => ({
          ...commonImportLogInputs,
          entity_id: affiliate.id,
          code: "INACTIVE_PARTNER",
          message: `Partner ${affiliate.user_email} not imported because status is "${affiliate.status}" (only active affiliates are imported).`,
        })),
      );
    }

    currentPage++;
    processedBatches++;
  }

  await lemonSqueezyImporter.queue({
    ...payload,
    action: hasMore ? "import-partners" : "import-customers",
    page: hasMore ? currentPage : undefined,
  });
}

async function createPartnerAndLinks({
  workspace,
  program,
  affiliate,
  group,
  userId,
  importId,
}: {
  workspace: Pick<WorkspaceProps, "id" | "plan">;
  program: Pick<
    Program,
    "id" | "workspaceId" | "domain" | "url" | "defaultFolderId"
  >;
  affiliate: LemonSqueezyAffiliate;
  group: Pick<
    PartnerGroup,
    | "id"
    | "discountId"
    | "clickRewardId"
    | "leadRewardId"
    | "saleRewardId"
    | "referralRewardId"
    | "customRewardId"
  >;
  userId: string;
  importId: string;
}) {
  if (!affiliate.user_email) {
    await logImportError({
      workspace_id: program.workspaceId,
      import_id: importId,
      source: "lemonsqueezy",
      entity: "partner",
      entity_id: affiliate.id,
      code: "PARTNER_NOT_FOUND",
      message: `Affiliate ${affiliate.id} not imported because it has no email.`,
    });

    return;
  }

  const partner = await prisma.partner.upsert({
    where: {
      email: affiliate.user_email,
    },
    create: {
      id: createId({ prefix: "pn_" }),
      name: affiliate.user_name || affiliate.user_email,
      email: affiliate.user_email,
    },
    update: {},
  });

  const { links } = await prisma.programEnrollment.upsert({
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
      referralRewardId: group.referralRewardId,
      customRewardId: group.customRewardId,
      discountId: group.discountId,
    },
    update: {
      status: "approved",
    },
    select: {
      links: {
        select: {
          key: true,
        },
      },
    },
  });

  if (links.length > 0 && links.some((link) => link.key === affiliate.id)) {
    console.log(
      `Partner ${partner.id} already has a link with key ${affiliate.id}, skipping...`,
    );
    return partner.id;
  }

  try {
    const partnerLink = await generatePartnerLink({
      workspace,
      program,
      partner: {
        id: partner.id,
        name: partner.name,
        email: partner.email!,
      },
      link: {
        domain: program.domain!,
        url: program.url!,
        // Use affiliate id so commissions can map affiliate_id → partner link
        key: affiliate.id,
      },
      userId,
    });

    // Reject suffixed keys — customers/commissions look up by exact affiliate id
    if (partnerLink.key !== affiliate.id) {
      await logImportError({
        workspace_id: program.workspaceId,
        import_id: importId,
        source: "lemonsqueezy",
        entity: "partner",
        entity_id: affiliate.id,
        code: "LINK_NOT_FOUND",
        message: `Partner link key conflict for affiliate ${affiliate.id}: generated key "${partnerLink.key}" instead of "${affiliate.id}".`,
      });
      return partner.id;
    }

    await createLink(partnerLink);
  } catch (error) {
    console.error("Error creating partner link", error, affiliate);
    await logImportError({
      workspace_id: program.workspaceId,
      import_id: importId,
      source: "lemonsqueezy",
      entity: "partner",
      entity_id: affiliate.id,
      code: "LINK_NOT_FOUND",
      message: `Failed to create partner link for affiliate ${affiliate.id}: ${
        error instanceof Error ? error.message : String(error)
      }`,
    });
  }

  return partner.id;
}
