// Note: not using
export function isPartnerEligibleForBounty({
  bountyGroupIds,
  bountyTagIds,
  partnerGroupId,
  partnerTagIds,
}: {
  bountyGroupIds: string[];
  bountyTagIds: string[];
  partnerGroupId: string | null;
  partnerTagIds: string[];
}): boolean {
  // No restrictions → available to all partners
  if (bountyGroupIds.length === 0 && bountyTagIds.length === 0) {
    return true;
  }

  const inGroup =
    partnerGroupId != null && bountyGroupIds.includes(partnerGroupId);

  const hasTag = bountyTagIds.some((id) => partnerTagIds.includes(id));

  return inGroup || hasTag;
}

export function buildBountyEligibilityWhere({
  groupId,
  partnerTagIds,
}: {
  groupId: string | undefined;
  partnerTagIds: string[];
}) {
  return {
    OR: [
      {
        AND: [
          {
            groups: {
              none: {},
            },
          },
          {
            partnerTags: {
              none: {},
            },
          },
        ],
      },
      {
        groups: {
          some: {
            groupId,
          },
        },
      },
      {
        partnerTags: {
          some: {
            partnerTagId: {
              in: partnerTagIds,
            },
          },
        },
      },
    ],
  };
}
