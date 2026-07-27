import { Prisma } from "@prisma/client";

export type TransformCampaignInput = Prisma.CampaignGetPayload<{
  include: {
    groups: true;
    partnerTags: true;
    workflow: true;
  };
}>;

export const transformCampaign = (campaign: TransformCampaignInput) => {
  const groups = campaign.groups.map(({ groupId }) => ({ id: groupId }));

  const partnerTags = campaign.partnerTags.map(({ partnerTagId }) => ({
    id: partnerTagId,
  }));

  return {
    ...campaign,
    groups,
    partnerTags,
    triggerCondition: campaign.workflow?.triggerConditions?.[0] ?? null,
  };
};
