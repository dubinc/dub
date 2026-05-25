import { logger } from "@/lib/axiom/server";
import { qstash } from "@/lib/cron";
import { APP_DOMAIN_WITH_NGROK } from "@dub/utils";
import * as z from "zod/v4";

const rewardJobPayloadSchema = z.object({
  rewardId: z.string(),
  groupId: z.string(),
  occurredAt: z.string(),
  startAfterProgramEnrollmentId: z.string().nullish(),
  operationId: z.string(),
  rewardSnapshot: z.object({
    description: z.string(),
  }),
});

export const rewardJobSchema = z.discriminatedUnion("event", [
  z.object({
    event: z.literal("reward-created"),
    payload: rewardJobPayloadSchema,
  }),

  z.object({
    event: z.literal("reward-updated"),
    payload: rewardJobPayloadSchema,
  }),

  z.object({
    event: z.literal("reward-deleted"),
    payload: rewardJobPayloadSchema,
  }),
]);

export type RewardJob = z.input<typeof rewardJobSchema>;
export type RewardJobPayload = z.input<typeof rewardJobPayloadSchema>;

export async function queueRewardProcessing({ event, payload }: RewardJob) {
  try {
    return await qstash.publishJSON({
      url: `${APP_DOMAIN_WITH_NGROK}/api/cron/rewards/process`,
      method: "POST",
      // set a flow control key to ensure that only one job is running for a given group at a time
      flowControl: {
        key: payload.groupId,
        parallelism: 1,
      },
      body: {
        event,
        payload,
      },
    });
  } catch (error) {
    logger.error("publishJSON.failed", {
      service: "qstash",
      event: "publishJSON.failed",
      url: `/api/cron/rewards/process`,
      errorName: error instanceof Error ? error.name : undefined,
      errorStack: error instanceof Error ? error.stack : undefined,
      correlation: {
        event,
        rewardId: payload.rewardId,
        groupId: payload.groupId,
      },
    });

    await logger.flush();
  }
}
