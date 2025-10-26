import { updateCampaignSchema } from "@/lib/zod/schemas/campaigns";
import { prisma } from "@dub/prisma";
import { Campaign } from "@dub/prisma/client";
import { z } from "zod";
import { DubApiError } from "../errors";
import {
  CAMPAIGN_EDITABLE_STATUSES,
  CAMPAIGN_STATUS_TRANSITIONS,
} from "./constants";

interface ValidateCampaignParams {
  input: Partial<z.infer<typeof updateCampaignSchema>>;
  campaign: Campaign;
}

export async function validateCampaign({
  input,
  campaign,
}: ValidateCampaignParams) {
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
    if (!CAMPAIGN_EDITABLE_STATUSES.includes(campaign.status)) {
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

  // Validate that the from address uses a verified email domain
  if (input.from) {
    const domainPart = input.from.split("@")[1];

    if (!domainPart) {
      throw new DubApiError({
        code: "bad_request",
        message: "Invalid email address format for 'from' field.",
      });
    }

    const emailDomain = await prisma.emailDomain.findUniqueOrThrow({
      where: {
        slug: domainPart,
      },
    });

    if (emailDomain.status !== "verified") {
      throw new DubApiError({
        code: "bad_request",
        message: `The domain '${domainPart}' is not verified. Please add and verify this email domain before using it.`,
      });
    }
  }

  return input;
}
