import { CampaignStatus } from "@prisma/client";

export const DEFAULT_CAMPAIGN_BODY = {
  type: "doc",
  content: [],
};

export const CAMPAIGN_STATUS_TRANSITIONS: Partial<
  Record<CampaignStatus, CampaignStatus[]>
> = {
  draft: ["active", "scheduled", "sending"],
  scheduled: ["sending", "cancelled"],
  sending: ["sent", "cancelled"],
  sent: [],
  cancelled: [],
  active: ["paused", "cancelled"],
  paused: ["active", "cancelled"],
};

// Move to utils
export function canTransitionCampaignStatus(
  from: CampaignStatus,
  to: CampaignStatus,
) {
  return CAMPAIGN_STATUS_TRANSITIONS[from]?.includes(to) ?? false;
}
