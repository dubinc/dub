import { Prisma } from "@prisma/client";

export type TransformBountyInput = {
  groups: { groupId: string }[];
  partnerTags: { partnerTagId: string }[];
  workflow?: {
    triggerConditions: Prisma.JsonValue;
  } | null;
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
