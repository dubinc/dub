import { CampaignStatus, CampaignType } from "@prisma/client";

export const DEFAULT_CAMPAIGN_BODY = {
  type: "doc",
  content: [],
};

export const CAMPAIGN_STATUS_TRANSITIONS: Record<
  CampaignType,
  Partial<Record<CampaignStatus, CampaignStatus[]>>
> = {
  marketing: {
    draft: ["scheduled"],
    scheduled: ["sending", "cancelled"],
    sending: ["sent", "cancelled"],
    sent: [],
    cancelled: [],
  },
  transactional: {
    draft: ["active"],
    active: ["paused"],
    paused: ["active"],
  },
} as const;

export const CAMPAIGN_EDITABLE_STATUSES = ["draft", "paused", "scheduled"];
