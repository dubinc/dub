import { DubApiError } from "@/lib/api/errors";
import { Prisma } from "@prisma/client";

export function buildBountyEligibilityWhere({
  groupId,
  partnerTagIds,
}: {
  groupId: string | undefined;
  partnerTagIds: string[];
}): Prisma.BountyWhereInput {
  return {
    AND: [
      {
        OR: [
          {
            groups: {
              none: {},
            },
          },
          ...(groupId
            ? [
                {
                  groups: {
                    some: {
                      groupId,
                    },
                  },
                },
              ]
            : []),
        ],
      },
      {
        OR: [
          {
            partnerTags: {
              none: {},
            },
          },
          ...(partnerTagIds.length > 0
            ? [
                {
                  partnerTags: {
                    some: {
                      partnerTagId: {
                        in: partnerTagIds,
                      },
                    },
                  },
                },
              ]
            : []),
        ],
      },
    ],
  };
}

export function isPartnerEligibleForBounty({
  bountyGroupIds,
  bountyTagIds,
  partnerGroupId,
  partnerTagIds = [],
}: {
  bountyGroupIds: string[];
  bountyTagIds: string[];
  partnerGroupId: string | null;
  partnerTagIds: string[] | undefined;
}): boolean {
  // No restrictions
  if (bountyGroupIds.length === 0 && bountyTagIds.length === 0) {
    return true;
  }

  // Group restrictions
  const inGroup =
    bountyGroupIds.length === 0 ||
    (partnerGroupId && bountyGroupIds.includes(partnerGroupId));

  // Tag restrictions
  const hasTag =
    bountyTagIds.length === 0 ||
    partnerTagIds.some((id) => bountyTagIds.includes(id));

  return Boolean(inGroup && hasTag);
}

export function throwIfPartnerNotEligibleForBounty({
  bountyGroupIds,
  bountyTagIds,
  partnerGroupId,
  partnerTagIds = [],
}: {
  bountyGroupIds: string[];
  bountyTagIds: string[];
  partnerGroupId: string | null;
  partnerTagIds: string[] | undefined;
}) {
  const isEligible = isPartnerEligibleForBounty({
    bountyGroupIds,
    bountyTagIds,
    partnerGroupId,
    partnerTagIds,
  });

  if (!isEligible) {
    throw new DubApiError({
      code: "forbidden",
      message: "You are not eligible for this bounty.",
    });
  }
}

export const bountyEligibilityIncludes = {
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
} satisfies Prisma.BountyInclude;
