import { prisma } from "@dub/prisma";
import { PartnerGroup, Program } from "@dub/prisma/client";
import { createId } from "../api/create-id";
import { createLink } from "../api/links";
import { generatePartnerLink } from "../api/partners/generate-partner-link";
import { logImportError } from "../tinybird/log-import-error";
import { WorkspaceProps } from "../types";
import { DEFAULT_PARTNER_GROUP } from "../zod/schemas/groups";
import { TapfiliateApi } from "./api";
import { TAPFILIATE_MAX_BATCHES, tapfiliateImporter } from "./importer";
import { TapfiliateImportPayload, TapfiliatePartner } from "./types";

export async function importPartners(payload: TapfiliateImportPayload) {
  const { importId, programId, userId, page = 1 } = payload;

  const program = await prisma.program.findUnique({
    where: {
      id: programId,
    },
    include: {
      groups: {
        where: {
          slug: DEFAULT_PARTNER_GROUP.slug,
        },
        select: {
          id: true,
          clickRewardId: true,
          leadRewardId: true,
          saleRewardId: true,
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

  const defaultGroup = program.groups[0];
  const workspace = program.workspace as WorkspaceProps;

  if (!defaultGroup) {
    console.error(`Default group not found for program ${programId}.`);
    return;
  }

  const { apiKey } = await tapfiliateImporter.getCredentials(
    program.workspace.id,
  );

  const tapfiliateApi = new TapfiliateApi({
    apiKey,
  });

  let currentPage = page;
  let hasMore = true;
  let processedBatches = 0;

  while (hasMore && processedBatches < TAPFILIATE_MAX_BATCHES) {
    const affiliates = await tapfiliateApi.listPartners({
      page: currentPage,
    });

    if (affiliates.length === 0) {
      hasMore = false;
      break;
    }

    await Promise.all(
      affiliates.map((affiliate) =>
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

    currentPage++;
    processedBatches++;
  }

  await tapfiliateImporter.queue({
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
  affiliate: TapfiliatePartner;
  group: Pick<
    PartnerGroup,
    "id" | "discountId" | "clickRewardId" | "leadRewardId" | "saleRewardId"
  >;
  userId: string;
  importId: string;
}) {
  if (!affiliate.email) {
    await logImportError({
      workspace_id: program.workspaceId,
      import_id: importId,
      source: "tapfiliate",
      entity: "partner",
      entity_id: affiliate.id,
      code: "PARTNER_NOT_FOUND",
      message: `Affiliate ${affiliate.id} not imported because it has no email.`,
    });

    return;
  }

  const name = [affiliate.firstname, affiliate.lastname]
    .filter(Boolean)
    .join(" ");

  const partner = await prisma.partner.upsert({
    where: {
      email: affiliate.email,
    },
    create: {
      id: createId({ prefix: "pn_" }),
      name: name || affiliate.email,
      email: affiliate.email,
      country: affiliate.address?.country?.code ?? null,
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
      `Partner ${partner.email} already has a link with key ${affiliate.id}, skipping...`,
    );
    return;
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
        key: affiliate.id,
      },
      userId,
    });

    return createLink(partnerLink);
  } catch (error) {
    console.error("Error creating partner link", error, affiliate);
    return null;
  }
}
