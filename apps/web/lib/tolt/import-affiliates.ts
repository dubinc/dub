import { prisma } from "@dub/prisma";
import { Program, Reward } from "@dub/prisma/client";
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
      rewards: true,
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
  const reward = saleReward || leadReward || clickReward;

  while (hasMore && processedBatches < MAX_BATCHES) {
    const { data: affiliates, has_more } = await toltApi.listAffiliates({
      programId: toltProgramId,
      startingAfter,
    });

    hasMore = has_more;

    if (affiliates.length === 0) {
      console.log("No more affiliates to import.");
      break;
    }

    const activeAffiliates = affiliates.filter(
      ({ status }) => status === "active",
    );

    if (activeAffiliates.length > 0) {
      await Promise.all(
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
    startingAfter = affiliates[affiliates.length - 1].id;
  }

  await toltImporter.queue({
    programId,
    action: hasMore ? "import-affiliates" : "import-referrals",
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
}
