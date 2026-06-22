// Determines whether a partner is eligible for a bounty.
// A bounty can be restricted by partner groups and/or partner tags. The rule is OR:
// - if the bounty has no restrictions at all, every partner is eligible (global)
// - otherwise the partner is eligible if they're in one of the bounty's groups
//   OR they have one of the bounty's tags
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

// Note: not using
