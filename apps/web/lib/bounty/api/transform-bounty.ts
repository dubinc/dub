import { BountyGroup, BountyPartnerTag, Workflow } from "@prisma/client";

export type TransformBountyInput = {
  groups: Pick<BountyGroup, "groupId">[];
  partnerTags: Pick<BountyPartnerTag, "partnerTagId">[];
  workflow?: Pick<Workflow, "triggerConditions"> | null;
};

export const transformBounty = <T extends TransformBountyInput>(bounty: T) => {
  const groups = bounty.groups.map(({ groupId }) => ({ id: groupId }));

  const partnerTags = bounty.partnerTags.map(({ partnerTagId }) => ({
    id: partnerTagId,
  }));

  const triggerConditions = bounty.workflow?.triggerConditions;
  const performanceCondition = Array.isArray(triggerConditions)
    ? triggerConditions[0] ?? null
    : null;

  return {
    ...bounty,
    groups,
    partnerTags,
    performanceCondition,
  };
};
