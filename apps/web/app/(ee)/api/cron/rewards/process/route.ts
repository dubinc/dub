import { notifyPartnerRewardChange } from "@/lib/api/partners/notify-partner-reward-change";
import { rewardJobSchema } from "@/lib/api/rewards/queue-reward-processing.ts";
import { CRON_BATCH_SIZE } from "@/lib/cron";
import { withCron } from "@/lib/cron/with-cron";
import { REWARD_EVENT_COLUMN_MAPPING } from "@/lib/zod/schemas/rewards";
import { prisma } from "@dub/prisma";
import { Prisma } from "@dub/prisma/client";
import { sleep } from "@dub/utils";
import { logAndRespond } from "../../utils";

export const dynamic = "force-dynamic";

export const maxDuration = 600;

// POST /api/cron/rewards/process
export const POST = withCron(async ({ rawBody }) => {
  const input = rewardJobSchema.parse(JSON.parse(rawBody));

  const { event, payload } = input;
  const { groupId, rewardId, occurredAt, rewardSnapshot } = payload;

  const reward = await prisma.reward.findUnique({
    where: {
      id: rewardId,
    },
    select: {
      id: true,
      event: true,
      createdAt: true,
    },
  });

  if (!reward) {
    return logAndRespond(`Reward ${rewardId} not found. Skipping...`);
  }

  const group = await prisma.partnerGroup.findUnique({
    where: {
      id: groupId,
    },
    select: {
      id: true,
      program: {
        select: {
          id: true,
          name: true,
          slug: true,
          logo: true,
          supportEmail: true,
        },
      },
    },
  });

  if (!group) {
    return logAndRespond(`Group ${groupId} not found. Skipping...`);
  }

  const rewardIdColumn = REWARD_EVENT_COLUMN_MAPPING[reward.event];

  let startingAfter: string | undefined = undefined;
  let where: Prisma.ProgramEnrollmentWhereInput | undefined = undefined;
  let data: Prisma.ProgramEnrollmentUpdateManyArgs["data"] | undefined =
    undefined;

  switch (event) {
    case "reward-created":
      where = { [rewardIdColumn]: null };
      data = { [rewardIdColumn]: reward.id };
      break;

    case "reward-updated":
      where = { [rewardIdColumn]: reward.id };
      break;

    case "reward-deleted":
      where = { [rewardIdColumn]: reward.id };
      data = { [rewardIdColumn]: null };
      break;
  }

  while (true) {
    const programEnrollments = await prisma.programEnrollment.findMany({
      where: {
        groupId: group.id,
        ...where,
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
      ...(startingAfter !== undefined && {
        skip: 1,
        cursor: {
          id: startingAfter,
        },
      }),
      take: CRON_BATCH_SIZE,
    });

    if (programEnrollments.length === 0) {
      break;
    }

    // Only when event is "reward-created" or "reward-deleted"
    if (data) {
      await prisma.programEnrollment.updateMany({
        where: {
          id: {
            in: programEnrollments.map(({ id }) => id),
          },
        },
        data: {
          ...data,
        },
      });
    }

    const users = programEnrollments.flatMap(({ partner }) =>
      partner.users.map(({ user }) => user),
    );

    await notifyPartnerRewardChange({
      action: event,
      program: group.program,
      reward,
      rewardSnapshot,
      effectiveAt: occurredAt,
      users,
    });

    startingAfter = programEnrollments[programEnrollments.length - 1].id;

    await sleep(500);
  }

  if (event === "reward-deleted") {
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

  return logAndRespond(`Processed reward ${rewardId} for group ${groupId}.`);
});
