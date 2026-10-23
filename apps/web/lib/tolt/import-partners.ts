import { prisma } from "@/lib/prisma";
import { sleep } from "@dub/utils";
import { Partner, Program } from "@prisma/client";

import { createId } from "../api/create-id";
import { detectAndRecordNetworkLevelBans } from "../api/fraud/detect-network-level-bans";
import { queuePartnerSearchSync } from "../api/partners/queue-partner-search-sync";
import { upsertImportedProgramEnrollment } from "../api/partners/upsert-imported-program-enrollment";
import { approveLinkedApplication } from "../program-applications/approve-linked-application";
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
      // Filled as soon as each enrollment is saved, so a partner whose later
      // step throws still reaches the search sync and the ban check.
      const enrolledPartnerIds: string[] = [];

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
              customRewardId: defaultGroup.customRewardId,
              referralRewardId: defaultGroup.referralRewardId,
              discountId: defaultGroup.discountId,
            },
            enrolledPartnerIds,
          }),
        ),
      );

      const partners = partnersPromise
        .filter(
          (p): p is PromiseFulfilledResult<Partner> => p.status === "fulfilled",
        )
        .map((p) => p.value);

      // Queue an index update because the imported partners were enrolled.
      // Queued per page rather than per partner.
      await queuePartnerSearchSync({
        partnerIds: enrolledPartnerIds,
        programId,
      });

      await detectAndRecordNetworkLevelBans({
        programId,
        partnerIds: enrolledPartnerIds,
      });

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

    await sleep(2000);

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
  enrolledPartnerIds,
}: {
  program: Program;
  affiliate: ToltAffiliate;
  defaultGroupAttributes: {
    groupId: string;
    saleRewardId: string | null;
    leadRewardId: string | null;
    clickRewardId: string | null;
    customRewardId: string | null;
    referralRewardId: string | null;
    discountId: string | null;
  };
  enrolledPartnerIds: string[];
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

  const { enrollment, preservedBan } = await upsertImportedProgramEnrollment({
    partnerId: partner.id,
    programId: program.id,
    create: {
      id: createId({ prefix: "pge_" }),
      programId: program.id,
      partnerId: partner.id,
      status: "approved",
      ...defaultGroupAttributes,
    },
  });

  enrolledPartnerIds.push(partner.id);

  if (!preservedBan) {
    await approveLinkedApplication({
      applicationId: enrollment.applicationId,
    });
  }

  return partner;
}
