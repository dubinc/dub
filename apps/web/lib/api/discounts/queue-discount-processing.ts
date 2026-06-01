import { logger } from "@/lib/axiom/server";
import { qstash } from "@/lib/cron";
import { APP_DOMAIN_WITH_NGROK } from "@dub/utils";
import * as z from "zod/v4";
import { incrementDiscountVersion } from "./discount-version";

export const discountJobSchema = z.object({
  event: z.enum(["discount-created", "discount-deleted"]),
  groupId: z.string(),
  version: z
    .number()
    .optional()
    .default(1)
    .describe(
      "Incremented by 1 for each new discount change (create/delete) in a group.",
    ),
  batchNumber: z.number().optional().default(1),
  startAfterProgramEnrollmentId: z.string().nullish(),
  discountSnapshot: z.object({
    id: z.string(),
  }),
});

export type DiscountJob = z.input<typeof discountJobSchema>;

export async function queueDiscountProcessing(params: DiscountJob) {
  try {
    // If version is provided (recursive cron job), use it, otherwise increment the version
    const version =
      params.version !== undefined
        ? params.version
        : await incrementDiscountVersion({
            groupId: params.groupId,
          });

    const response = await qstash.publishJSON({
      url: `${APP_DOMAIN_WITH_NGROK}/api/cron/discounts/process`,
      method: "POST",
      body: {
        ...params,
        version,
      },
    });

    if (!response?.messageId) {
      throw new Error(
        "We couldn't start discount processing right now. Please try again in a few moments.",
      );
    }

    return response;
  } catch (error) {
    logger.error("publishJSON.failed", {
      service: "qstash",
      event: "publishJSON.failed",
      url: `/api/cron/discounts/process`,
      errorName: error instanceof Error ? error.name : undefined,
      errorStack: error instanceof Error ? error.stack : undefined,
      correlation: {
        event: params.event,
        groupId: params.groupId,
        discountId: params.discountSnapshot.id,
      },
    });

    await logger.flush();

    throw new Error(
      "We couldn't start discount processing right now. Please try again in a few moments.",
    );
  }
}
