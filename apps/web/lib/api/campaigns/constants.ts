import { CampaignStatus, CampaignType } from "@dub/prisma/client";

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
    scheduled: ["sending", "canceled"],
    sending: ["sent", "canceled"],
    sent: [],
    canceled: [],
  },
  transactional: {
    draft: ["active"],
    active: ["paused"],
    paused: ["active"],
  },
} as const;

export const CAMPAIGN_EDITABLE_STATUSES: CampaignStatus[] = [
  "draft",
  "paused",
  "scheduled",
];

export const CAMPAIGN_READONLY_STATUSES: CampaignStatus[] = [
  "sending",
  "sent",
  "canceled",
];

export const CAMPAIGN_ACTIVE_STATUSES: CampaignStatus[] = [
  "active",
  "scheduled",
  "sending",
];
