import { prisma } from "@dub/prisma";
import { Program } from "@dub/prisma/client";
import { COUNTRIES } from "@dub/utils";
import { createId } from "../api/create-id";
import { logImportError } from "../tinybird/log-import-error";
import { redis } from "../upstash";
import { DEFAULT_PARTNER_GROUP } from "../zod/schemas/groups";
import { PartnerStackApi } from "./api";
import {
  MAX_BATCHES,
  PARTNER_IDS_KEY_PREFIX,
  partnerStackImporter,
} from "./importer";
import { PartnerStackImportPayload, PartnerStackPartner } from "./types";

export async function importPartners(payload: PartnerStackImportPayload) {
  const { importId, programId, startingAfter } = payload;

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

  const { publicKey, secretKey } = await partnerStackImporter.getCredentials(
    program.workspaceId,
  );

  const partnerStackApi = new PartnerStackApi({
    publicKey,
    secretKey,
  });

  let hasMore = true;
  let processedBatches = 0;
  let currentStartingAfter = startingAfter;

  while (hasMore && processedBatches < MAX_BATCHES) {
    const partners = await partnerStackApi.listPartners({
      startingAfter: currentStartingAfter,
    });

    if (partners.length === 0) {
      hasMore = false;
      break;
    }

    await Promise.allSettled(
      partners.map((partner) =>
        createPartner({
          program,
          partner,
          defaultGroupAttributes: {
            groupId: defaultGroup.id,
            saleRewardId: defaultGroup.saleRewardId,
            leadRewardId: defaultGroup.leadRewardId,
            clickRewardId: defaultGroup.clickRewardId,
            discountId: defaultGroup.discountId,
          },
          importId,
        }),
      ),
    );

    await new Promise((resolve) => setTimeout(resolve, 2000));

    processedBatches++;
    currentStartingAfter = partners[partners.length - 1].key;
  }

  await partnerStackImporter.queue({
    ...payload,
    startingAfter: hasMore ? currentStartingAfter : undefined,
    action: hasMore ? "import-partners" : "import-links",
  });
}

async function createPartner({
  program,
  partner,
  defaultGroupAttributes,
  importId,
}: {
  program: Program;
  partner: PartnerStackPartner;
  defaultGroupAttributes: {
    groupId: string;
    saleRewardId: string | null;
    leadRewardId: string | null;
    clickRewardId: string | null;
    discountId: string | null;
  };
  importId: string;
}) {
  const commonImportLogInputs = {
    workspace_id: program.workspaceId,
    import_id: importId,
    source: "partnerstack",
    entity: "partner",
    entity_id: partner.key,
  } as const;

  if (partner.stats.CUSTOMER_COUNT === 0) {
    await logImportError({
      ...commonImportLogInputs,
      code: "INACTIVE_PARTNER",
      message: `No leads found for partner ${partner.email}`,
    });

    return;
  }

  const countryCode = partner.address?.country
    ? Object.keys(COUNTRIES).find(
        (key) => COUNTRIES[key] === partner.address?.country,
      )
    : null;

  if (!countryCode && partner.address?.country) {
    console.log(
      `Country code not found for country ${partner.address.country}`,
    );
  }

  const { id: partnerId } = await prisma.partner.upsert({
    where: {
      email: partner.email,
    },
    create: {
      id: createId({ prefix: "pn_" }),
      name: `${partner.first_name} ${partner.last_name}`,
      email: partner.email,
      country: countryCode,
    },
    update: {
      // do nothing
    },
  });

  await prisma.programEnrollment.upsert({
    where: {
      partnerId_programId: {
        partnerId,
        programId: program.id,
      },
    },
    create: {
      programId: program.id,
      partnerId,
      status: "approved",
      ...defaultGroupAttributes,
    },
    update: {
      status: "approved",
    },
  });

  // PS doesn't return the partner email address in the customers response
  // so we need to keep a map of partner_key (PS) -> partner_id (Dub)
  // and use it to identify the partner in the customers response
  await redis.hset(`${PARTNER_IDS_KEY_PREFIX}:${program.id}`, {
    [partner.key]: partnerId,
  });
}
