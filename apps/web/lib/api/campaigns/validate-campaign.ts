import { updateCampaignSchema } from "@/lib/zod/schemas/campaigns";
import { prisma } from "@dub/prisma";
import { Campaign, EmailDomain } from "@dub/prisma/client";
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
    const emailDomains = await prisma.emailDomain.findMany({
      where: {
        programId: campaign.programId,
      },
    });

    validateCampaignFromAddress({
      campaign: {
        ...campaign,
        from: input.from,
      },
      emailDomains,
    });
  }

  return input;
}

export function validateCampaignFromAddress({
  campaign,
  emailDomains,
}: {
  campaign: Pick<Campaign, "id" | "from" | "programId">;
  emailDomains: Pick<EmailDomain, "slug" | "status">[];
}) {
  if (emailDomains.length === 0) {
    throw new DubApiError({
      code: "bad_request",
      message: `No email domains found for program (${campaign.programId}).`,
    });
  }

  if (!campaign.from) {
    throw new DubApiError({
      code: "bad_request",
      message: `Campaign (${campaign.id}) from address is required.`,
    });
  }

  const parts = campaign.from.split("@");

  if (parts.length !== 2) {
    throw new DubApiError({
      code: "bad_request",
      message: `Campaign (${campaign.id}) has an invalid email address format for 'from' field.`,
    });
  }

  const domainPart = parts[1];

  const emailDomain = emailDomains.find(
    (emailDomain) => emailDomain.slug === domainPart,
  );

  if (!emailDomain) {
    throw new DubApiError({
      code: "bad_request",
      message: `Email domain (${domainPart}) not found in the program (${campaign.programId}) for campaign (${campaign.id}).`,
    });
  }

  if (emailDomain.status !== "verified") {
    throw new DubApiError({
      code: "bad_request",
      message: `Email domain (${domainPart}) is not verified in the program (${campaign.programId}) for campaign (${campaign.id}).`,
    });
  }
}
