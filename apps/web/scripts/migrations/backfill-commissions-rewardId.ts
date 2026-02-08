import { REWARD_EVENT_COLUMN_MAPPING } from "@/lib/zod/schemas/rewards";
import { prisma } from "@dub/prisma";
import "dotenv-flow/config";

// Backfill `rewardId` in `Commission` table
async function main() {
  const event = "sale"; // Repeat this for click, lead, sale
  const rewarIdColumn = REWARD_EVENT_COLUMN_MAPPING[event];

  const programEnrollments = await prisma.programEnrollment.groupBy({
    by: ["programId", rewarIdColumn],
    _count: {
      _all: true,
    },
  });

  console.table(programEnrollments);

  for (const {
    _count,
    programId,
    [rewarIdColumn]: rewardId,
  } of programEnrollments) {
    if (_count._all === 0) {
      continue;
    }

    const partners = await prisma.programEnrollment.findMany({
      where: {
        programId,
        [rewarIdColumn]: rewardId!,
      },
      select: {
        partnerId: true,
      },
    });

    const partnerIds = partners.map((p) => p.partnerId);

    if (partnerIds.length === 0) {
      continue;
    }

    await prisma.commission.updateMany({
      where: {
        programId,
        partnerId: {
          in: partnerIds,
        },
        rewardId: null,
        type: {
          not: "custom",
        },
      },
      data: {
        rewardId,
      },
    });
  }
}

main();
