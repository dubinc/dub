import { logger } from "@/lib/axiom/server";
import { qstash } from "@/lib/cron";
import { APP_DOMAIN_WITH_NGROK } from "@dub/utils";
import { EventType } from "@prisma/client";
import * as z from "zod/v4";
import { incrementRewardVersion } from "./reward-version";

export const rewardJobSchema = z.object({
  event: z.enum(["reward-created", "reward-updated", "reward-deleted"]),
  groupId: z.string(),
  occurredAt: z.string(),
  version: z
    .number()
    .optional()
    .default(1)
    .describe(
      "Incremented by 1 for each new reward change (create/update/delete) for same reward type in a group.",
    ),
  batchNumber: z
    .number()
    .optional()
    .default(1)
    .describe("Used as a idempotency key for Resend."),
  startAfterProgramEnrollmentId: z.string().nullish(),
  rewardSnapshot: z.object({
    id: z.string(),
    event: z.enum(EventType),
    description: z.string(),
  }),
});

export type RewardJob = z.input<typeof rewardJobSchema>;

export async function queueRewardProcessing(params: RewardJob) {
  try {
    // If version is provided (recursive cron job), use it, otherwise increment the version
    const version =
      params.version !== undefined
        ? params.version
        : await incrementRewardVersion({
            groupId: params.groupId,
            event: params.rewardSnapshot.event,
          });

    const response = await qstash.publishJSON({
      url: `${APP_DOMAIN_WITH_NGROK}/api/cron/rewards/process`,
      method: "POST",
      body: {
        ...params,
        version,
      },
    });

    if (!response?.messageId) {
      throw new Error(
        "We couldn't start reward processing right now. Please try again in a few moments.",
      );
    }

    return response;
  } catch (error) {
    logger.error("publishJSON.failed", {
      service: "qstash",
      event: "publishJSON.failed",
      url: `/api/cron/rewards/process`,
      errorName: error instanceof Error ? error.name : undefined,
      errorStack: error instanceof Error ? error.stack : undefined,
      correlation: {
        event: params.event,
        groupId: params.groupId,
        rewardId: params.rewardSnapshot.id,
      },
    });

    await logger.flush();

    throw new Error(
      "We couldn't start reward processing right now. Please try again in a few moments.",
    );
  }
}
