import { notifyPartnerRewardChange } from "@/lib/api/partners/notify-partner-reward-change";
import { RewardJobPayload } from "@/lib/api/rewards/queue-reward-processing";
import { CRON_BATCH_SIZE } from "@/lib/cron";
import { REWARD_EVENT_COLUMN_MAPPING } from "@/lib/zod/schemas/rewards";
import { prisma } from "@dub/prisma";
import { PartnerGroup, Program, Reward } from "@dub/prisma/client";
import { sleep } from "@dub/utils";

export async function handleRewardDeleted({
  payload,
  program,
  group,
  reward,
}: {
  payload: RewardJobPayload;
  program: Pick<Program, "id" | "name" | "slug" | "logo" | "supportEmail">;
  group: Pick<PartnerGroup, "id">;
  reward: Pick<Reward, "id" | "event">;
}) {
  const { occurredAt, rewardSnapshot } = payload;
  const rewardIdColumn = REWARD_EVENT_COLUMN_MAPPING[reward.event];

  while (true) {
    const programEnrollments = await prisma.programEnrollment.findMany({
      where: {
        groupId: group.id,
        [rewardIdColumn]: reward.id,
      },
      select: {
        id: true,
        partner: {
          select: {
            users: {
              select: {
                user: {
                  select: {
                    name: true,
                    email: true,
                  },
                },
              },
            },
          },
        },
      },
      orderBy: {
        id: "asc",
      },
      take: CRON_BATCH_SIZE,
    });

    if (programEnrollments.length === 0) {
      break;
    }

    const { count } = await prisma.programEnrollment.updateMany({
      where: {
        groupId: group.id,
        [rewardIdColumn]: reward.id,
      },
      data: {
        [rewardIdColumn]: null,
      },
    });

    if (count > 0) {
      const users = programEnrollments.flatMap(({ partner }) =>
        partner.users.map(({ user }) => user),
      );

      await notifyPartnerRewardChange({
        action: "reward-deleted",
        program,
        reward,
        rewardSnapshot,
        effectiveAt: occurredAt,
        users,
      });
    }

    await sleep(1000);
  }

  try {
    await prisma.reward.delete({
      where: {
        id: reward.id,
      },
    });
  } catch (error) {
    if (error.code !== "P2025") {
      throw new Error(
        `Failed to hard delete reward ${reward.id}: ${error.message}`,
      );
    }
  }
}
