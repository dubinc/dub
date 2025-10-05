import { CampaignSummary } from "@/lib/types";

// Calculates percentages for campaign summary metrics
export const calculateCampaignPercentages = (summary: CampaignSummary) => {
  const { sent, delivered, opened, bounced } = summary;

  if (sent === 0) {
    return {
      ...summary,
      deliveredPercentage: 0,
      openedPercentage: 0,
      bouncedPercentage: 0,
    };
  }

  const sentInverse = 100 / sent;

  return {
    ...summary,
    deliveredPercentage: Number((delivered * sentInverse).toFixed(2)),
    openedPercentage: Number((opened * sentInverse).toFixed(2)),
    bouncedPercentage: Number((bounced * sentInverse).toFixed(2)),
  };
};
