import { Prisma } from "@prisma/client";

export const campaignEligibilityIncludes = {
  groups: {
    select: {
      groupId: true,
    },
  },
  partnerTags: {
    select: {
      partnerTagId: true,
    },
  },
} satisfies Prisma.CampaignInclude;

export type TransformCampaignInput = Prisma.CampaignGetPayload<{
  include: {
    groups: {
      select: {
        groupId: true;
      };
    };
    partnerTags: {
      select: {
        partnerTagId: true;
      };
    };
    workflow: {
      select: {
        triggerConditions: true;
      };
    };
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
    triggerConditions: campaign.workflow?.triggerConditions,
  };
};
