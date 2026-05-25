import { handleAndReturnErrorResponse } from "@/lib/api/errors";
import { notifyPartnersRewardChanged } from "@/lib/api/partners/notify-partners-reward-changed";
import { serializeReward } from "@/lib/api/partners/serialize-reward";
import {
  queueRewardEnrollmentSync,
  RewardSnapshot,
} from "@/lib/api/rewards/queue-reward-enrollment-sync";
import { CRON_BATCH_SIZE } from "@/lib/cron";
import { verifyQstashSignature } from "@/lib/cron/verify-qstash";
import { REWARD_EVENT_COLUMN_MAPPING } from "@/lib/zod/schemas/rewards";
import { prisma } from "@dub/prisma";
import { EventType, Prisma } from "@dub/prisma/client";
import { log } from "@dub/utils";
import * as z from "zod/v4";
import { logAndRespond } from "../../utils";

export const dynamic = "force-dynamic";

const schema = z.object({
  action: z.enum(["create", "delete"]),
  rewardId: z.string(),
  groupId: z.string(),
  programId: z.string(),
  event: z.enum(EventType),
  startAfterProgramEnrollmentId: z.string().optional(),
  rewardSnapshot: z
    .object({
      title: z.string(),
      description: z.string(),
      icon: z.string(),
    })
    .optional(),
});

// POST /api/cron/rewards/sync-enrollments
export async function POST(req: Request) {
  try {
    const rawBody = await req.text();
    await verifyQstashSignature({ req, rawBody });

    const {
      action,
      rewardId,
      groupId,
      programId,
      event,
      startAfterProgramEnrollmentId,
      rewardSnapshot,
    } = schema.parse(JSON.parse(rawBody));

    const rewardIdColumn = REWARD_EVENT_COLUMN_MAPPING[event];

    const enrollmentWhere: Prisma.ProgramEnrollmentWhereInput =
      action === "create"
        ? {
            groupId,
            [rewardIdColumn]: null,
          }
        : {
            [rewardIdColumn]: rewardId,
          };

    const programEnrollments = await prisma.programEnrollment.findMany({
      where: {
        ...enrollmentWhere,
        ...(startAfterProgramEnrollmentId && {
          id: {
            gt: startAfterProgramEnrollmentId,
          },
        }),
      },
      select: {
        id: true,
      },
      take: CRON_BATCH_SIZE,
      orderBy: {
        id: "asc",
      },
    });

    console.log(
      `Found ${programEnrollments.length} enrollments to ${action} ${event} reward ${rewardId}.`,
    );

    if (programEnrollments.length > 0) {
      const updatedEnrollments = await prisma.programEnrollment.updateMany({
        where: {
          id: {
            in: programEnrollments.map(({ id }) => id),
          },
        },
        data: {
          [rewardIdColumn]: action === "create" ? rewardId : null,
        },
      });

      console.log(
        `Updated ${updatedEnrollments.count} enrollments to ${action} ${event} reward ${rewardId}.`,
      );
    }

    const remainingEnrollments = await prisma.programEnrollment.count({
      where: enrollmentWhere,
    });

    if (remainingEnrollments > 0) {
      if (programEnrollments.length === 0) {
        return logAndRespond(
          `Found ${remainingEnrollments} remaining enrollments for reward ${rewardId}, but no enrollments were processed. Skipping...`,
          { logLevel: "error" },
        );
      }

      await queueRewardEnrollmentSync({
        action,
        rewardId,
        groupId,
        programId,
        event,
        startAfterProgramEnrollmentId:
          programEnrollments[programEnrollments.length - 1].id,
        rewardSnapshot: rewardSnapshot as RewardSnapshot | undefined,
      });

      return logAndRespond(
        `Updated ${programEnrollments.length} enrollments for reward ${rewardId}, ${remainingEnrollments} remaining. Starting next batch...`,
      );
    }

    const effectiveAt = new Date();

    if (action === "delete") {
      try {
        await prisma.reward.delete({
          where: {
            id: rewardId,
          },
        });
      } catch (error) {
        // treat already-deleted reward as success so retries can resend the notification
        if (error.code !== "P2025") {
          await log({
            message: `Failed to hard delete reward ${rewardId}: ${error.message}`,
            type: "errors",
          });

          return logAndRespond(
            `Finished syncing enrollments for reward ${rewardId}, but hard delete failed.`,
            {
              logLevel: "error",
            },
          );
        }
      }

      await notifyPartnersRewardChanged({
        programId,
        groupId,
        action: "removed",
        effectiveAt,
        rewardSnapshot,
        idempotencyKey: `reward-sync-${rewardId}-removed`,
      });

      return logAndRespond(
        `Finished syncing enrollments and deleted reward ${rewardId}.`,
      );
    }

    const reward = await prisma.reward.findUnique({
      where: {
        id: rewardId,
      },
    });

    if (!reward) {
      return logAndRespond(`Reward ${rewardId} not found. Skipping email...`, {
        logLevel: "error",
      });
    }

    await notifyPartnersRewardChanged({
      programId,
      groupId,
      action: "added",
      effectiveAt,
      reward: serializeReward(reward),
      idempotencyKey: `reward-sync-${rewardId}-added`,
    });

    return logAndRespond(
      `Finished syncing enrollments for created reward ${rewardId}.`,
    );
  } catch (error) {
    await log({
      message: `Error syncing reward enrollments: ${error.message}.`,
      type: "errors",
    });

    return handleAndReturnErrorResponse(error);
  }
}
