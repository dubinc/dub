import { updateCampaignSchema } from "@/lib/zod/schemas/campaigns";
import { Campaign } from "@dub/prisma/client";
import { z } from "zod";
import { DubApiError } from "../errors";
import { CAMPAIGN_STATUS_TRANSITIONS } from "./constants";

interface ValidateCampaignParams {
  input: Partial<z.infer<typeof updateCampaignSchema>>;
  campaign: Campaign;
}

export function validateCampaign({ input, campaign }: ValidateCampaignParams) {
  if (input.status) {
    const validNextStatuses =
      CAMPAIGN_STATUS_TRANSITIONS[campaign.type][campaign.status];

    const canTransition = validNextStatuses?.includes(input.status);

    if (!canTransition) {
      throw new DubApiError({
        code: "bad_request",
        message: `A ${campaign.status} campaign can't be moved to ${input.status}.`,
      });
    }
  }

  if (
    input.name ||
    input.subject ||
    input.bodyJson ||
    input.groupIds ||
    input.triggerCondition ||
    input.from ||
    input.scheduledAt
  ) {
    if (["active", "sending", "sent", "cancelled"].includes(campaign.status)) {
      throw new DubApiError({
        code: "bad_request",
        message: `You can't make changes to a "${campaign.status}" campaign.`,
      });
    }
  }

  if (campaign.type === "marketing") {
    delete input.triggerCondition;
  }

  if (campaign.type === "transactional") {
    delete input.scheduledAt;
  }

  return input;
}
