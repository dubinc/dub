import { Campaign, CampaignStatus, CampaignType } from "@prisma/client";

type MarketingBroadcastCampaign = Pick<
  Campaign,
  "type" | "status" | "scheduledAt"
>;

export function isDueMarketingCampaign({
  campaign,
  now = new Date(),
}: {
  campaign: MarketingBroadcastCampaign;
  now?: Date;
}) {
  return (
    campaign.type === CampaignType.marketing &&
    campaign.status === CampaignStatus.scheduled &&
    (!campaign.scheduledAt || campaign.scheduledAt <= now)
  );
}

export function shouldEnqueueDueMarketingBroadcast({
  previous,
  next,
  now = new Date(),
}: {
  previous: MarketingBroadcastCampaign;
  next: MarketingBroadcastCampaign;
  now?: Date;
}) {
  return (
    isDueMarketingCampaign({ campaign: next, now }) &&
    !isDueMarketingCampaign({ campaign: previous, now })
  );
}
