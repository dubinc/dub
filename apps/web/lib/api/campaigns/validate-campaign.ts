import {
  ALLOWED_ATTRIBUTE_VALUES_IN_DAYS,
  updateCampaignSchema,
} from "@/lib/zod/schemas/campaigns";
import { z } from "zod";
import { DubApiError } from "../errors";

export const validateCampaign = (
  campaign: z.infer<typeof updateCampaignSchema>,
) => {
  console.log(campaign)

  if (campaign.status === "draft") {
    return;
  }

  if (campaign.type === "transactional") {
    if (!campaign.triggerCondition) {
      throw new DubApiError({
        message: "Trigger condition is required for transactional campaigns.",
        code: "bad_request",
      });
    }

    if (
      !ALLOWED_ATTRIBUTE_VALUES_IN_DAYS.includes(
        campaign.triggerCondition.value,
      )
    ) {
      throw new DubApiError({
        message: `Trigger condition value must be one of the following: ${ALLOWED_ATTRIBUTE_VALUES_IN_DAYS.join(", ")}.`,
        code: "bad_request",
      });
    }
  }

  if (campaign.type === "marketing" && campaign.triggerCondition) {
    throw new DubApiError({
      message: "Trigger condition is not allowed for marketing campaigns.",
      code: "bad_request",
    });
  }
};
