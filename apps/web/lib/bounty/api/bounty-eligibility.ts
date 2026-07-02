import { DubApiError } from "@/lib/api/errors";
import {
  Bounty,
  BountyGroup,
  BountyPartnerTag,
  Prisma,
  ProgramEnrollment,
  ProgramPartnerTag,
} from "@prisma/client";
import {
  getEffectiveBountyPeriod,
  isBountyExpired,
  isBountyStarted,
} from "../bounty-period";

type PartnerBountyEligibilityParams = {
  programEnrollment: Pick<
    ProgramEnrollment,
    "groupId" | "createdAt" | "groupJoinedAt" | "status"
  > & {
    programPartnerTags: Pick<ProgramPartnerTag, "partnerTagId">[];
  };
  bounty: Pick<
    Bounty,
    "startsAt" | "endsAt" | "endsAfterDays" | "startMode" | "archivedAt" | "id"
  > & {
    groups: Pick<BountyGroup, "groupId">[];
    partnerTags: Pick<BountyPartnerTag, "partnerTagId">[];
  };
  // Fallback for enrollments without an explicit group (program.defaultGroupId)
  defaultGroupId?: string | null;
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

// Relative bounties start when a partner joins (no startsAt filter).
// Absolute bounties must have started and not expired.
export function buildActiveBountyPeriodWhere(): Prisma.BountyWhereInput {
  const now = new Date();

  return {
    archivedAt: null,
    OR: [
      {
        startMode: "relative",
      },
      {
        startMode: "absolute",
        startsAt: {
          lt: now,
        },
        OR: [
          {
            endsAt: null,
          },
          {
            endsAt: {
              gt: now,
            },
          },
        ],
      },
    ],
  };
}

export function isPartnerEligibleForBounty({
  programEnrollment,
  bounty,
  defaultGroupId,
}: PartnerBountyEligibilityParams): boolean {
  const bountyGroupIds = bounty.groups.map((g) => g.groupId);
  const bountyTagIds = bounty.partnerTags.map((t) => t.partnerTagId);

  const partnerGroupId = programEnrollment.groupId || defaultGroupId;
  const partnerTagIds = programEnrollment.programPartnerTags.map(
    (t) => t.partnerTagId,
  );

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

export function canPartnerSubmitBounty({
  programEnrollment,
  bounty,
  defaultGroupId,
}: PartnerBountyEligibilityParams): boolean {
  // Only approved partners can submit bounties
  if (programEnrollment.status !== "approved") {
    console.log(
      `Partner enrollment status "${programEnrollment.status}" is not allowed to submit bounty ${bounty.id}.`,
    );
    return false;
  }

  const isEligible = isPartnerEligibleForBounty({
    programEnrollment,
    bounty,
    defaultGroupId,
  });

  if (!isEligible) {
    console.log(
      `Partner is not eligible for bounty ${bounty.id} because they are not in any of the assigned groups or partner tags.`,
    );
    return false;
  }

  if (bounty.archivedAt) {
    console.log(`Bounty ${bounty.id} is archived.`);
    return false;
  }

  const { startsAt, endsAt } = getEffectiveBountyPeriod({
    programEnrollment,
    bounty,
  });

  if (!isBountyStarted(startsAt)) {
    console.log(`Bounty ${bounty.id} has not started yet.`);
    return false;
  }

  if (isBountyExpired(endsAt)) {
    console.log(`Bounty ${bounty.id} has ended.`);
    return false;
  }

  return true;
}

// Throws 404 (not 400) to avoid revealing bounties the partner shouldn't see.
// A partner with a submission can always view the bounty, even if they are no
// longer eligible (e.g. moved out of an eligible group) or it was archived.
// Expired bounties stay viewable.
export function throwIfPartnerCannotViewBounty({
  programEnrollment,
  bounty,
  defaultGroupId,
  hasSubmission,
}: PartnerBountyEligibilityParams & { hasSubmission: boolean }) {
  if (hasSubmission) {
    return;
  }

  const notFoundError = new DubApiError({
    code: "not_found",
    message: "Bounty not found.",
  });

  const isEligible = isPartnerEligibleForBounty({
    programEnrollment,
    bounty,
    defaultGroupId,
  });

  if (!isEligible) {
    throw notFoundError;
  }

  const { startsAt } = getEffectiveBountyPeriod({
    programEnrollment,
    bounty,
  });

  if (!isBountyStarted(startsAt)) {
    throw notFoundError;
  }

  if (bounty.archivedAt) {
    throw notFoundError;
  }
}

export function throwIfPartnerCannotSubmitBounty({
  programEnrollment,
  bounty,
  defaultGroupId,
}: PartnerBountyEligibilityParams) {
  // Only approved partners can submit bounties
  if (programEnrollment.status !== "approved") {
    throw new DubApiError({
      code: "bad_request",
      message: "You are not allowed to submit a bounty for this program.",
    });
  }

  const isEligible = isPartnerEligibleForBounty({
    programEnrollment,
    bounty,
    defaultGroupId,
  });

  if (!isEligible) {
    throw new DubApiError({
      code: "bad_request",
      message: "You are not eligible for this bounty.",
    });
  }

  if (bounty.archivedAt) {
    throw new DubApiError({
      code: "bad_request",
      message: "This bounty is archived.",
    });
  }

  const { startsAt, endsAt } = getEffectiveBountyPeriod({
    programEnrollment,
    bounty,
  });

  if (!isBountyStarted(startsAt)) {
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
