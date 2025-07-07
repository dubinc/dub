import { prisma } from "@dub/prisma";
import { Partner, Program, Reward } from "@dub/prisma/client";
import { createId } from "../api/create-id";
import { REWARD_EVENT_COLUMN_MAPPING } from "../zod/schemas/rewards";
import { ToltApi } from "./api";
import { MAX_BATCHES, toltImporter } from "./importer";
import { ToltAffiliate } from "./types";

export async function importAffiliates({
  programId,
  startingAfter,
}: {
  programId: string;
  startingAfter?: string;
}) {
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

  const { token, toltProgramId } = await toltImporter.getCredentials(
    program.workspaceId,
  );

  const toltApi = new ToltApi({ token });

  let hasMore = true;
  let processedBatches = 0;

  const saleReward = program.rewards.find((r) => r.event === "sale");
  const leadReward = program.rewards.find((r) => r.event === "lead");
  const clickReward = program.rewards.find((r) => r.event === "click");
  const defaultReward = saleReward || leadReward || clickReward;

  while (hasMore && processedBatches < MAX_BATCHES) {
    const affiliates = await toltApi.listAffiliates({
      programId: toltProgramId,
      startingAfter,
    });

    if (affiliates.length === 0) {
      hasMore = false;
      break;
    }

    const activeAffiliates = affiliates.filter(
      ({ status }) => status === "active",
    );

    if (activeAffiliates.length > 0) {
      const partnersPromise = await Promise.allSettled(
        activeAffiliates.map((affiliate) =>
          createPartner({
            program,
            affiliate,
            reward: defaultReward,
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

    await new Promise((resolve) => setTimeout(resolve, 2000));

    processedBatches++;
    startingAfter = affiliates[affiliates.length - 1].id;
  }

  await toltImporter.queue({
    programId,
    action: hasMore ? "import-affiliates" : "import-links",
    ...(hasMore && { startingAfter }),
  });
}

// Create partner
async function createPartner({
  program,
  affiliate,
  reward,
}: {
  program: Program;
  affiliate: ToltAffiliate;
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
