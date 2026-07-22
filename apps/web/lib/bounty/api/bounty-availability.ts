import {
  Bounty,
  BountyGroup,
  BountyStartMode,
  BountySubmission,
  Prisma,
  Program,
  ProgramEnrollment,
} from "@prisma/client";
import { addDays } from "date-fns";
import { isBountyExpired, isBountyStarted } from "../bounty-period";

type PartnerBountyEligibilityInput = {
  program: Pick<Program, "defaultGroupId">;
  bounty: Pick<
    Bounty,
    | "id"
    | "startsAt"
    | "endsAt"
    | "endsAfterDays"
    | "startMode"
    | "archivedAt"
    | "createdAt"
  > & {
    groups: Pick<BountyGroup, "groupId">[];
  };
  programEnrollment: Pick<
    ProgramEnrollment,
    "createdAt" | "groupId" | "status"
  >;
};

export function buildBountyEligibilityWhere(
  groupId: string | undefined,
): Prisma.BountyWhereInput {
  return {
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
  };
}

export function buildBountyActivePeriodWhere(): Prisma.BountyWhereInput {
  const now = new Date();

  return {
    OR: [
      {
        startMode: BountyStartMode.relative,
      },
      {
        startMode: BountyStartMode.absolute,
        startsAt: {
          lte: now,
        },
        OR: [
          {
            endsAt: null,
          },
          {
            endsAt: {
              gte: now,
            },
          },
        ],
      },
    ],
  };
}

export const bountyEligibilityIncludes = {
  groups: {
    select: {
      groupId: true,
    },
  },
} satisfies Prisma.BountyInclude;

export function getEffectiveBountyPeriod({
  programEnrollment,
  bounty,
}: {
  programEnrollment: Pick<ProgramEnrollment, "createdAt">;
  bounty: Pick<Bounty, "startsAt" | "endsAt" | "endsAfterDays" | "startMode">;
}) {
  const { createdAt } = programEnrollment;
  const { startsAt, endsAt, endsAfterDays, startMode } = bounty;

  // If startMode is absolute, use the startsAt (Assumed to be set).
  // If startMode is relative, use the program enrollment createdAt.
  const bountyStartDate =
    startMode === BountyStartMode.absolute ? startsAt! : createdAt;

  return {
    startsAt: bountyStartDate,
    endsAt: endsAfterDays ? addDays(bountyStartDate, endsAfterDays) : endsAt,
  };
}

export function isPartnerEligibleForBounty({
  program,
  bounty,
  programEnrollment,
}: PartnerBountyEligibilityInput): boolean {
  // Archived bounties are not visible
  if (bounty.archivedAt) {
    console.log(`Bounty ${bounty.id} is archived.`);
    return false;
  }

  // If the bounty has groups, check if the partner is in one of them
  const bountyGroupIds = bounty.groups.map((g) => g.groupId);
  const partnerGroupId = programEnrollment.groupId || program.defaultGroupId;

  if (bountyGroupIds.length > 0 && !bountyGroupIds.includes(partnerGroupId)) {
    console.log(
      `Partner is not eligible for bounty ${bounty.id} because they are not in any of the assigned groups. Partner's groupId: ${partnerGroupId}. Assigned groupIds: ${bountyGroupIds.join(", ")}.`,
    );
    return false;
  }

  // Relative bounties are for new partners only (enrolled on/after bounty creation)
  if (bounty.startMode === BountyStartMode.relative) {
    if (programEnrollment.createdAt < bounty.createdAt) {
      console.log(
        `Partner enrolled before relative bounty ${bounty.id} was created.`,
      );
      return false;
    }
  }

  // Check if the bounty is in the active period
  const { startsAt, endsAt } = getEffectiveBountyPeriod({
    programEnrollment,
    bounty,
  });

  // If the bounty is not in the active period, it is not visible
  if (!isBountyStarted(startsAt)) {
    console.log(`Bounty ${bounty.id} is not started.`);
    return false;
  }

  if (isBountyExpired(endsAt)) {
    console.log(`Bounty ${bounty.id} is expired.`);
    return false;
  }

  return true;
}

export const canPartnerSeeBounty = ({
  program,
  bounty,
  programEnrollment,
}: PartnerBountyEligibilityInput & {
  bounty: PartnerBountyEligibilityInput["bounty"] & {
    submissions: Pick<BountySubmission, "id">[];
  };
}): boolean => {
  if (bounty.archivedAt) {
    return false;
  }

  // Bounties the partner has a submission on stay visible
  if (bounty.submissions.length > 0) {
    return true;
  }

  return isPartnerEligibleForBounty({
    program,
    bounty,
    programEnrollment,
  });
};

export const canPartnerSubmitBounty = ({
  program,
  bounty,
  programEnrollment,
}: PartnerBountyEligibilityInput): boolean => {
  // Only approved partners can submit bounties
  if (programEnrollment.status !== "approved") {
    return false;
  }

  return isPartnerEligibleForBounty({
    program,
    bounty,
    programEnrollment,
  });
};
