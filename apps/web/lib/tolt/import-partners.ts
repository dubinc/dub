import { prisma } from "@dub/prisma";
import { Partner, Program } from "@dub/prisma/client";
import { createId } from "../api/create-id";
import { logImportError } from "../tinybird/log-import-error";
import { DEFAULT_PARTNER_GROUP } from "../zod/schemas/groups";
import { ToltApi } from "./api";
import { MAX_BATCHES, toltImporter } from "./importer";
import { ToltAffiliate, ToltImportPayload } from "./types";

export async function importPartners(payload: ToltImportPayload) {
  let { importId, programId, toltProgramId, startingAfter } = payload;

  const program = await prisma.program.findUniqueOrThrow({
    where: {
      id: programId,
    },
    include: {
      groups: {
        where: {
          slug: DEFAULT_PARTNER_GROUP.slug,
        },
      },
    },
  });

  const defaultGroup = program.groups[0];

  const { token } = await toltImporter.getCredentials(program.workspaceId);

  const toltApi = new ToltApi({ token });

  let hasMore = true;
  let processedBatches = 0;

  const commonImportLogInputs = {
    workspace_id: program.workspaceId,
    import_id: importId,
    source: "tolt",
  } as const;

  while (hasMore && processedBatches < MAX_BATCHES) {
    const affiliates = await toltApi.listPartners({
      programId: toltProgramId,
      startingAfter,
    });

    if (affiliates.length === 0) {
      hasMore = false;
      break;
    }

    const activeAffiliates: typeof affiliates = [];
    const notImportedAffiliates: typeof affiliates = [];

    for (const affiliate of affiliates) {
      if (affiliate.status === "active") {
        activeAffiliates.push(affiliate);
      } else {
        notImportedAffiliates.push(affiliate);
      }
    }

    if (activeAffiliates.length > 0) {
      const partnersPromise = await Promise.allSettled(
        activeAffiliates.map((affiliate) =>
          createPartner({
            program,
            affiliate,
            defaultGroupAttributes: {
              groupId: defaultGroup.id,
              saleRewardId: defaultGroup.saleRewardId,
              leadRewardId: defaultGroup.leadRewardId,
              clickRewardId: defaultGroup.clickRewardId,
              discountId: defaultGroup.discountId,
            },
          }),
        ),
      );

      const partners = partnersPromise
        .filter(
          (p): p is PromiseFulfilledResult<Partner> => p.status === "fulfilled",
        )
        .map((p) => p.value);

      if (partners.length > 0) {
        await toltImporter.addPartners({
          programId,
          partnerIds: partners.map((p) => p.id),
        });
      }
    }

    if (notImportedAffiliates.length > 0) {
      await logImportError(
        notImportedAffiliates.map((affiliate) => ({
          ...commonImportLogInputs,
          entity: "partner",
          entity_id: affiliate.id,
          code: "INACTIVE_PARTNER",
          message: `Partner ${affiliate.email} not imported because it is not active.`,
        })),
      );
    }

    await new Promise((resolve) => setTimeout(resolve, 2000));

    processedBatches++;
    startingAfter = affiliates[affiliates.length - 1].id;
  }

  await toltImporter.queue({
    ...payload,
    startingAfter: hasMore ? startingAfter : undefined,
    action: hasMore ? "import-partners" : "import-links",
  });
}

// Create partner
async function createPartner({
  program,
  affiliate,
  defaultGroupAttributes,
}: {
  program: Program;
  affiliate: ToltAffiliate;
  defaultGroupAttributes: {
    groupId: string;
    saleRewardId: string | null;
    leadRewardId: string | null;
    clickRewardId: string | null;
    discountId: string | null;
  };
}) {
  const partner = await prisma.partner.upsert({
    where: {
      email: affiliate.email,
    },
    create: {
      id: createId({ prefix: "pn_" }),
      name: `${affiliate.first_name} ${affiliate.last_name}`,
      email: affiliate.email,
      companyName: affiliate.company_name,
      country: affiliate.country_code,
    },
    update: {
      // do nothing
    },
  });

  await prisma.programEnrollment.upsert({
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
  });

  return partner;
}
