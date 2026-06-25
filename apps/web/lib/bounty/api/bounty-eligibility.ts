import { DubApiError } from "@/lib/api/errors";
import {
  Bounty,
  BountyGroup,
  BountyPartnerTag,
  Prisma,
  ProgramEnrollment,
  ProgramPartnerTag,
} from "@prisma/client";
import { getEffectiveBountyDateRange, isBountyExpired } from "../bounty-timing";

type PartnerBountyEligibilityParams = {
  programEnrollment: Pick<
    ProgramEnrollment,
    "groupId" | "createdAt" | "groupJoinedAt" | "status"
  > & {
    programPartnerTags: Pick<ProgramPartnerTag, "partnerTagId">[];
  };
  bounty: Pick<
    Bounty,
    "startsAt" | "endsAt" | "endDurationDays" | "startMode" | "archivedAt"
  > & {
    groups: Pick<BountyGroup, "groupId">[];
    partnerTags: Pick<BountyPartnerTag, "partnerTagId">[];
  };
};

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

export function throwIfPartnerCannotViewBounty({
  programEnrollment,
  bounty,
}: PartnerBountyEligibilityParams) {
  if (!["approved", "invited"].includes(programEnrollment.status)) {
    throw new DubApiError({
      code: "bad_request",
      message: "You are not allowed to submit a bounty for this program.",
    });
  }

  const bountyGroupIds = bounty.groups.map((g) => g.groupId);
  const bountyTagIds = bounty.partnerTags.map((t) => t.partnerTagId);
  const partnerTagIds = programEnrollment.programPartnerTags.map(
    (t) => t.partnerTagId,
  );

  const isEligible = isPartnerEligibleForBounty({
    bountyGroupIds,
    bountyTagIds,
    partnerGroupId: programEnrollment.groupId,
    partnerTagIds,
  });

  if (!isEligible) {
    throw new DubApiError({
      code: "bad_request",
      message:
        "This bounty is not available to you. Please contact program support if you believe this is an error.",
    });
  }
}

export function throwIfPartnerCannotSubmitBounty({
  programEnrollment,
  bounty,
}: PartnerBountyEligibilityParams) {
  throwIfPartnerCannotViewBounty({
    programEnrollment,
    bounty,
  });

  if (bounty.archivedAt) {
    throw new DubApiError({
      code: "bad_request",
      message: "This bounty is not available.",
    });
  }

  const { startsAt, endsAt } = getEffectiveBountyDateRange({
    programEnrollment,
    bounty,
  });

  if (startsAt > new Date()) {
    throw new DubApiError({
      code: "bad_request",
      message: "This bounty has not started yet.",
    });
  }

  if (isBountyExpired(endsAt)) {
    throw new DubApiError({
      code: "bad_request",
      message: "This bounty has ended.",
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
