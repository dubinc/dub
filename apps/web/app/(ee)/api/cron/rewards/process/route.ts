import { notifyPartnerRewardChange } from "@/lib/api/partners/notify-partner-reward-change";
import {
  queueRewardProcessing,
  rewardJobSchema,
} from "@/lib/api/rewards/queue-reward-processing";
import { isStaleRewardVersion } from "@/lib/api/rewards/reward-version";
import { withCron } from "@/lib/cron/with-cron";
import { prisma } from "@/lib/prisma";
import {
  ACTIVE_ENROLLMENT_STATUSES,
  INACTIVE_ENROLLMENT_STATUSES,
} from "@/lib/zod/schemas/partners";
import { REWARD_EVENT_COLUMN_MAPPING } from "@/lib/zod/schemas/rewards";
import { Prisma } from "@prisma/client";
import { logAndRespond } from "../../utils";

export const dynamic = "force-dynamic";

// POST /api/cron/rewards/process
export const POST = withCron(async ({ rawBody }) => {
  const input = rewardJobSchema.parse(JSON.parse(rawBody));

  const {
    event,
    groupId,
    version,
    occurredAt,
    batchNumber,
    rewardSnapshot,
    startAfterProgramEnrollmentId,
  } = input;

  const { id: rewardId } = rewardSnapshot;

  const reward = await prisma.reward.findUnique({
    where: {
      id: rewardId,
    },
    select: {
      id: true,
      event: true,
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

  const isStaleVersion = await isStaleRewardVersion({
    version,
    groupId,
    event: rewardSnapshot.event,
  });

  if (isStaleVersion) {
    return logAndRespond(
      "Reward changed while processing. Skipping stale reward evaluation.",
    );
  }

  const rewardIdColumn = REWARD_EVENT_COLUMN_MAPPING[reward.event];

  let startingAfter = startAfterProgramEnrollmentId;
  let where: Prisma.ProgramEnrollmentWhereInput | undefined = undefined;
  let data: Prisma.ProgramEnrollmentUpdateManyArgs["data"] | undefined =
    undefined;

  switch (event) {
    case "reward-created":
      data = { [rewardIdColumn]: reward.id };
      break;

    case "reward-updated":
      where = { [rewardIdColumn]: reward.id };
      break;

    case "reward-deleted":
      data = { [rewardIdColumn]: null };
      break;
  }

  const programEnrollments = await prisma.programEnrollment.findMany({
    where: {
      groupId: group.id,
      status: {
        notIn: INACTIVE_ENROLLMENT_STATUSES,
      },
      ...(startAfterProgramEnrollmentId && {
        id: {
          gt: startAfterProgramEnrollmentId,
        },
      }),
      ...where,
    },
    select: {
      id: true,
      status: true,
      partner: {
        select: {
          users: {
            where: {
              user: {
                email: {
                  not: null,
                },
              },
            },
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
    take: 300,
  });

  if (programEnrollments.length > 0) {
    let shouldNotify = !data;

    // Only when event is "reward-created" or "reward-deleted"
    if (data) {
      const { count } = await prisma.programEnrollment.updateMany({
        where: {
          id: {
            in: programEnrollments.map(({ id }) => id),
          },
        },
        data: {
          ...data,
        },
      });

      shouldNotify = count > 0;
    }

    if (shouldNotify) {
      const users = programEnrollments
        .filter(({ status }) => ACTIVE_ENROLLMENT_STATUSES.includes(status))
        .flatMap(({ partner }) => partner.users.map(({ user }) => user));

      await notifyPartnerRewardChange({
        action: event,
        program: group.program,
        reward,
        rewardSnapshot,
        effectiveAt: occurredAt,
        users,
        idempotencyKey: `partner-reward-change-${rewardId}-${batchNumber}-${version}`,
      });
    }

    startingAfter = programEnrollments[programEnrollments.length - 1].id;

    await queueRewardProcessing({
      ...input,
      startAfterProgramEnrollmentId: startingAfter,
      batchNumber: batchNumber + 1,
    });

    return logAndRespond(
      `Enqueued next batch (${batchNumber + 1}) for reward ${rewardId} for the group ${groupId}.`,
    );
  }

  // No more program enrollments found, hard delete the reward
  if (event === "reward-deleted") {
    try {
      await prisma.reward.delete({
        where: {
          id: reward.id,
        },
      });
    } catch (error) {
      // Treat already-deleted reward as success so retries can resend the notification
      if (!(error.code === "P2025")) {
        throw new Error(
          `Failed to hard delete reward ${reward.id}: ${error instanceof Error ? error.message : String(error)}`,
        );
      }
    }
  }

  return logAndRespond(
    `Finished processing reward ${rewardId} for the group ${groupId}.`,
  );
});
