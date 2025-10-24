import { createOrUpdateRewardSchema } from "@/lib/zod/schemas/rewards";
import { z } from "zod";
import { DubApiError } from "../errors";

export function validateReward(
  reward: Partial<z.infer<typeof createOrUpdateRewardSchema>>,
) {
  if (reward.event === "click" || reward.event === "lead") {
    if (reward.type === "percentage") {
      throw new DubApiError({
        code: "bad_request",
        message:
          "Percentage rewards are not allowed for click and lead events.",
      });
    }

    if (reward.amountInCents == null) {
      throw new DubApiError({
        code: "bad_request",
        message: "amountInCents must be provided for click and lead events.",
      });
    }

    if (reward.amountInPercentage != null) {
      throw new DubApiError({
        code: "bad_request",
        message: "amountInPercentage is not allowed for click and lead events.",
      });
    }
  }

  if (reward.event === "sale") {
    if (reward.amountInCents != null && reward.amountInPercentage != null) {
      throw new DubApiError({
        code: "bad_request",
        message:
          "amountInCents and amountInPercentage cannot be used together.",
      });
    }

    if (reward.amountInCents == null && reward.amountInPercentage == null) {
      throw new DubApiError({
        code: "bad_request",
        message: "amountInCents or amountInPercentage must be provided.",
      });
    }

    if (reward.type === "flat" && reward.amountInCents == null) {
      throw new DubApiError({
        code: "bad_request",
        message: "amountInCents must be provided when type is 'flat'.",
      });
    }

    if (reward.type === "percentage" && reward.amountInPercentage == null) {
      throw new DubApiError({
        code: "bad_request",
        message:
          "amountInPercentage must be provided when type is 'percentage'.",
      });
    }
  }
}
