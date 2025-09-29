import { createCampaignSchema } from "@/lib/zod/schemas/campaigns";
import { z } from "zod";
import { DubApiError } from "../errors";

export const validateCampaign = ({
  type,
  triggerCondition,
}: Partial<z.infer<typeof createCampaignSchema>>) => {
  if (type === "automation" && triggerCondition === null) {
    throw new DubApiError({
      message: "Trigger condition is required for automation campaigns.",
      code: "bad_request",
    });
  }
};
