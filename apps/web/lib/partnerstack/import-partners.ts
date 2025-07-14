import { prisma } from "@dub/prisma";
import { Program, Reward } from "@dub/prisma/client";
import { COUNTRIES } from "@dub/utils";
import { createId } from "../api/create-id";
import { REWARD_EVENT_COLUMN_MAPPING } from "../zod/schemas/rewards";
import { PartnerStackApi } from "./api";
import { MAX_BATCHES, partnerStackImporter } from "./importer";
import { PartnerStackImportPayload, PartnerStackPartner } from "./types";

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
    const partners = await partnerStackApi.listPartners({
      startingAfter: currentStartingAfter,
    });

    if (partners.length === 0) {
      hasMore = false;
      break;
    }

    const activePartners = partners.filter(
      ({ stats }) => stats.CUSTOMER_COUNT > 0,
    );

    if (activePartners.length > 0) {
      await Promise.allSettled(
        activePartners.map((partner) =>
          createPartner({
            program,
            partner,
            reward,
          }),
        ),
      );
    }

    await new Promise((resolve) => setTimeout(resolve, 2000));

    processedBatches++;
    currentStartingAfter = partners[partners.length - 1].key;
  }

  await partnerStackImporter.queue({
    ...payload,
    ...(hasMore && { startingAfter: currentStartingAfter }),
    action: hasMore ? "import-partners" : "import-links",
  });
}

async function createPartner({
  program,
  partner,
  reward,
}: {
  program: Program;
  partner: PartnerStackPartner;
  reward?: Pick<Reward, "id" | "event">;
}) {
  const countryCode = partner.address?.country
    ? Object.keys(COUNTRIES).find(
        (key) => COUNTRIES[key] === partner.address?.country,
      )
    : null;

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
      ...(reward && { [REWARD_EVENT_COLUMN_MAPPING[reward.event]]: reward.id }),
    },
    update: {
      status: "approved",
    },
  });
}
