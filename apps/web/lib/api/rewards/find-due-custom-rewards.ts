import { CRON_BATCH_SIZE } from "@/lib/cron";
import { prisma } from "@/lib/prisma";
import type { CustomRewardConfig } from "@/lib/types";
import { customRewardConfigSchema } from "@/lib/zod/schemas/rewards";
import { EventType } from "@prisma/client";
import { getUtcPeriodDate, isCadenceDue } from "./custom-reward-utils";

export type DueCustomReward = {
  id: string;
  programId: string;
  amountInCents: number;
  maxDuration: number | null;
  config: CustomRewardConfig;
};

export async function findDueCustomRewards({
  periodDate = getUtcPeriodDate(),
}: {
  periodDate?: string;
} = {}): Promise<DueCustomReward[]> {
  const due: DueCustomReward[] = [];
  let startAfterId: string | undefined;

  while (true) {
    const rewards = await prisma.reward.findMany({
      where: {
        event: EventType.custom,
        programId: {
          not: null,
        },
        ...(startAfterId && {
          id: {
            gt: startAfterId,
          },
        }),
      },
      select: {
        id: true,
        programId: true,
        amountInCents: true,
        maxDuration: true,
        config: true,
      },
      orderBy: {
        id: "asc",
      },
      take: CRON_BATCH_SIZE,
    });

    if (rewards.length === 0) {
      break;
    }

    for (const reward of rewards) {
      if (!reward.programId || reward.amountInCents == null) {
        continue;
      }

      const parsedConfig = customRewardConfigSchema.safeParse(reward.config);

      if (!parsedConfig.success) {
        console.error(
          `[findDueCustomRewards] Invalid config for reward ${reward.id}. Skipping...`,
        );
        continue;
      }

      if (!isCadenceDue(parsedConfig.data, periodDate)) {
        continue;
      }

      due.push({
        id: reward.id,
        programId: reward.programId,
        amountInCents: reward.amountInCents,
        maxDuration: reward.maxDuration,
        config: parsedConfig.data,
      });
    }

    startAfterId = rewards[rewards.length - 1].id;

    if (rewards.length < CRON_BATCH_SIZE) {
      break;
    }
  }

  return due;
}
