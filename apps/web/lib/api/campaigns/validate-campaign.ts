import { updateCampaignSchema } from "@/lib/zod/schemas/campaigns";
import { CampaignStatus, CampaignType } from "@dub/prisma/client";
import { z } from "zod";
import { DubApiError } from "../errors";

interface ValidateCampaignParams
  extends Partial<z.infer<typeof updateCampaignSchema>> {
  type: CampaignType;
}

export function validateCampaign({
  status,
  scheduledAt,
}: ValidateCampaignParams) {
  if (status === CampaignStatus.scheduled) {
    if (!scheduledAt) {
      throw new DubApiError({
        code: "bad_request",
        message: "Date is required to schedule a campaign.",
      });
    }

    if (new Date(scheduledAt) <= new Date()) {
      throw new DubApiError({
        code: "bad_request",
        message: "Scheduled date must be in the future.",
      });
    }
  }
}

// TODO:
// return validated data
