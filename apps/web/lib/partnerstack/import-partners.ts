import { prisma } from "@dub/prisma";
import { Program, Reward } from "@dub/prisma/client";
import { COUNTRIES } from "@dub/utils";
import { createId } from "../api/create-id";
import { REWARD_EVENT_COLUMN_MAPPING } from "../zod/schemas/rewards";
import { PartnerStackApi } from "./api";
import { MAX_BATCHES, partnerStackImporter } from "./importer";
import { PartnerStackAffiliate, PartnerStackImportPayload } from "./types";

export async function importPartners(payload: PartnerStackImportPayload) {
  const { programId, startingAfter } = payload;

  const program = await prisma.program.findUniqueOrThrow({
    where: {
      id: programId,
    },
    include: {
      rewards: {
        where: {
          default: true,
        },
      },
    },
  });

  const { publicKey, secretKey } = await partnerStackImporter.getCredentials(
    program.workspaceId,
  );

  const partnerStackApi = new PartnerStackApi({
    publicKey,
    secretKey,
  });

  const saleReward = program.rewards.find((r) => r.event === "sale");
  const leadReward = program.rewards.find((r) => r.event === "lead");
  const clickReward = program.rewards.find((r) => r.event === "click");
  const reward = saleReward || leadReward || clickReward;

  let hasMore = true;
  let processedBatches = 0;
  let currentStartingAfter = startingAfter;

  while (hasMore && processedBatches < MAX_BATCHES) {
    const affiliates = await partnerStackApi.listAffiliates({
      startingAfter: currentStartingAfter,
    });

    if (affiliates.length === 0) {
      hasMore = false;
      break;
    }

    const activeAffiliates = affiliates.filter(
      (affiliate) => affiliate.stats.CUSTOMER_COUNT > 0,
    );

    if (activeAffiliates.length > 0) {
      await Promise.allSettled(
        activeAffiliates.map((affiliate) =>
          createPartner({
            program,
            affiliate,
            reward,
          }),
        ),
      );
    }

    await new Promise((resolve) => setTimeout(resolve, 2000));

    processedBatches++;
    currentStartingAfter = affiliates[affiliates.length - 1].key;
  }

  await partnerStackImporter.queue({
    ...payload,
    ...(hasMore && { startingAfter: currentStartingAfter }),
    action: hasMore ? "import-partners" : "import-links",
  });
}

async function createPartner({
  program,
  affiliate,
  reward,
}: {
  program: Program;
  affiliate: PartnerStackAffiliate;
  reward?: Pick<Reward, "id" | "event">;
}) {
  const countryCode = affiliate.address?.country
    ? Object.keys(COUNTRIES).find(
        (key) => COUNTRIES[key] === affiliate.address?.country,
      )
    : null;

  const partner = await prisma.partner.upsert({
    where: {
      email: affiliate.email,
    },
    create: {
      id: createId({ prefix: "pn_" }),
      name: `${affiliate.first_name} ${affiliate.last_name}`,
      email: affiliate.email,
      country: countryCode,
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
      programId: program.id,
      partnerId: partner.id,
      status: "approved",
      ...(reward && { [REWARD_EVENT_COLUMN_MAPPING[reward.event]]: reward.id }),
    },
    update: {
      status: "approved",
    },
  });
}
