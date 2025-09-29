import {
  ALLOWED_ATTRIBUTE_VALUES_IN_DAYS,
  createCampaignSchema,
} from "@/lib/zod/schemas/campaigns";
import { z } from "zod";
import { DubApiError } from "../errors";

export const validateCampaign = ({
  type,
  triggerCondition,
}: Partial<z.infer<typeof createCampaignSchema>>) => {
  if (type === "transactional") {
    if (!triggerCondition) {
      throw new DubApiError({
        message: "Trigger condition is required for transactional campaigns.",
        code: "bad_request",
      });
    }

    if (!ALLOWED_ATTRIBUTE_VALUES_IN_DAYS.includes(triggerCondition.value)) {
      throw new DubApiError({
        message: `Trigger condition value must be one of the following: ${ALLOWED_ATTRIBUTE_VALUES_IN_DAYS.join(", ")}.`,
        code: "bad_request",
      });
    }
  }

  if (type === "marketing" && triggerCondition) {
    throw new DubApiError({
      message: "Trigger condition is not allowed for marketing campaigns.",
      code: "bad_request",
    });
  }
};
