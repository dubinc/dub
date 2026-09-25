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
import {
  REWARD_EVENT_COLUMN_MAPPING,
  REWARD_EVENT_RELATION_MAPPING,
} from "@/lib/zod/schemas/rewards";
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
      clickRewardId: true,
      leadRewardId: true,
      saleRewardId: true,
      referralRewardId: true,
      customRewardId: true,
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
  const rewardRelation = REWARD_EVENT_RELATION_MAPPING[reward.event];

  // reward-created jobs assign this reward only to enrollments that still
  // inherit "no reward" or a soft-deleted reward (custom overrides stay).
  // Skip if it's no longer the group's default for this event
  if (event === "reward-created") {
    if (rewardId !== group[rewardIdColumn]) {
      return logAndRespond(
        `Reward ${rewardId} is not the default reward for the group ${groupId}. Skipping...`,
      );
    }
  }

  const isStaleVersion = await isStaleRewardVersion({
    version,
    groupId,
    event: rewardSnapshot.event,
  });

  // Always unassign on reward-deleted even if a newer group-default create
  // made this version stale — otherwise inheritors stay on the soft-deleted id.
  if (event !== "reward-deleted" && isStaleVersion) {
    return logAndRespond(
      "Reward changed while processing. Skipping stale reward evaluation.",
    );
  }

  let startingAfter = startAfterProgramEnrollmentId;
  let where: Prisma.ProgramEnrollmentWhereInput | undefined = undefined;
  let data: Prisma.ProgramEnrollmentUpdateManyArgs["data"] | undefined =
    undefined;

  switch (event) {
    case "reward-created":
      // Assign only inheritors: no reward yet, or still pointing at a
      // soft-deleted default (programId null).
      where = {
        OR: [
          { [rewardIdColumn]: null },
          { [rewardRelation]: { is: { programId: null } } },
        ],
      };
      data = { [rewardIdColumn]: reward.id };
      break;

    case "reward-updated":
      where = { [rewardIdColumn]: reward.id };
      break;

    case "reward-deleted":
      where = { [rewardIdColumn]: reward.id };
      data = { [rewardIdColumn]: group[rewardIdColumn] ?? null };
      break;
  }

  const programEnrollments = await prisma.programEnrollment.findMany({
    where: {
      groupId: group.id,
      // reward-deleted must also clear banned/deactivated/rejected enrollments.
      // Those FKs block orphan hard-delete. Notifications stay active-only below.
      ...(event !== "reward-deleted" && {
        status: {
          notIn: INACTIVE_ENROLLMENT_STATUSES,
        },
      }),
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
          ...where,
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

    if (shouldNotify && !isStaleVersion) {
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

  return logAndRespond(
    `Finished processing reward ${rewardId} for the group ${groupId}.`,
  );
});
