import { prisma } from "@dub/prisma";
import { Program, Reward } from "@dub/prisma/client";
import { COUNTRY_CODES } from "@dub/utils";
import { createId } from "../api/create-id";
import { REWARD_EVENT_COLUMN_MAPPING } from "../zod/schemas/rewards";
import { PartnerStackApi } from "./api";
import { MAX_BATCHES, partnerStackImporter } from "./importer";
import { PartnerStackAffiliate, PartnerStackImportPayload } from "./types";

export async function importAffiliates(payload: PartnerStackImportPayload) {
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

  const { token } = await partnerStackImporter.getCredentials(
    program.workspaceId,
  );

  const partnerStackApi = new PartnerStackApi({
    token,
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

    if (affiliates.length > 0) {
      await Promise.allSettled(
        affiliates.map((affiliate) =>
          createPartner({
            program,
            affiliate,
            reward,
          }),
        ),
      );

      // TODO:
      // Remove the partners with 0 leads
    }

    await new Promise((resolve) => setTimeout(resolve, 2000));

    processedBatches++;
    currentStartingAfter = affiliates[affiliates.length - 1].key;
  }

  await partnerStackImporter.queue({
    ...payload,
    ...(hasMore && { startingAfter: currentStartingAfter }),
    action: hasMore ? "import-affiliates" : "import-links",
  });
}

// Create partner
async function createPartner({
  program,
  affiliate,
  reward,
}: {
  program: Program;
  affiliate: PartnerStackAffiliate;
  reward?: Pick<Reward, "id" | "event">;
}) {
  const partner = await prisma.partner.upsert({
    where: {
      email: affiliate.email,
    },
    create: {
      id: createId({ prefix: "pn_" }),
      name: `${affiliate.first_name} ${affiliate.last_name}`,
      email: affiliate.email,
      country: COUNTRY_CODES[affiliate.address.country],
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

  return partner;
}
