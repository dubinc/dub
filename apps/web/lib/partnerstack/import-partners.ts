import { prisma } from "@dub/prisma";
import { PartnerGroup, Program } from "@dub/prisma/client";
import { COUNTRIES, COUNTRY_CODES } from "@dub/utils";
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

const COUNTRY_NAME_TO_CODE = new Map(
  Object.entries(COUNTRIES).map(([code, name]) => [name, code]),
);

export async function importPartners(payload: PartnerStackImportPayload) {
  const { importId, programId, startingAfter } = payload;

  const program = await prisma.program.findUniqueOrThrow({
    where: {
      id: programId,
    },
    include: {
      groups: true,
    },
  });

  const groupMap = Object.fromEntries(
    program.groups.map((group) => [group.slug, group]),
  );

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
          group: groupMap[partner.group?.slug ?? DEFAULT_PARTNER_GROUP.slug],
          importId,
        }),
      ),
    );

    await new Promise((resolve) => setTimeout(resolve, 2000));

    processedBatches++;
    currentStartingAfter = partners[partners.length - 1].key;
  }

  // After importing partners, clean up by deleting any groups that have no assigned partners
  if (!hasMore) {
    const groups = await prisma.partnerGroup.findMany({
      where: {
        programId,
        slug: {
          not: DEFAULT_PARTNER_GROUP.slug,
        },
        partners: {
          none: {},
        },
      },
      select: {
        id: true,
      },
    });

    if (groups.length > 0) {
      console.log(
        `Found ${groups.length} groups with no partners, deleting...`,
      );

      await prisma.partnerGroup.deleteMany({
        where: {
          id: {
            in: groups.map(({ id }) => id),
          },
        },
      });
    }
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
  group,
  importId,
}: {
  program: Program;
  partner: PartnerStackPartner;
  group: PartnerGroup;
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

  // Resolve partner's country: check if it's a valid code first,
  // otherwise fall back to lookup by country name because PS returns the name in some cases
  const country = partner.address?.country;
  const countryCode = country
    ? COUNTRY_CODES.includes(country)
      ? country
      : COUNTRY_NAME_TO_CODE.get(country) ?? null
    : null;

  if (country && !countryCode) {
    console.log(`Country code not found for country ${country}`);
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
      id: createId({ prefix: "pge_" }),
      programId: program.id,
      partnerId,
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
  });

  // PS doesn't return the partner email address in the customers response
  // so we need to keep a map of partner_key (PS) -> partner_id (Dub)
  // and use it to identify the partner in the customers response
  await redis.hset(`${PARTNER_IDS_KEY_PREFIX}:${program.id}`, {
    [partner.key]: partnerId,
  });
}
