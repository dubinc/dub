import { Bounty, Prisma, ProgramEnrollment } from "@prisma/client";
import { addDays } from "date-fns";

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
  programEnrollment: Pick<ProgramEnrollment, "groupJoinedAt" | "createdAt">;
  bounty: Pick<Bounty, "startsAt" | "endsAt" | "endsAfterDays" | "startMode">;
}) {
  const { createdAt, groupJoinedAt } = programEnrollment;
  const { startsAt, endsAt, endsAfterDays, startMode } = bounty;

  // If startMode is absolute, use the startsAt (Assumed to be set).
  // If startMode is relative, use the groupJoinedAt or createdAt.
  const bountyStartDate =
    startMode === "absolute" ? startsAt! : groupJoinedAt || createdAt;

  return {
    startsAt: bountyStartDate,
    endsAt: endsAfterDays ? addDays(bountyStartDate, endsAfterDays) : endsAt,
  };
}

export const canPartnerSeeBounty = ({
  programEnrollment,
  bounty,
}: {
  programEnrollment: Pick<ProgramEnrollment, "groupJoinedAt" | "createdAt">;
  bounty: Pick<Bounty, "startsAt" | "endsAt" | "endsAfterDays" | "startMode">;
}) => {
  //
};

export const canPartnerSubmitToBounty = ({
  programEnrollment,
  bounty,
}: {
  programEnrollment: Pick<ProgramEnrollment, "groupJoinedAt" | "createdAt">;
  bounty: Pick<Bounty, "startsAt" | "endsAt" | "endsAfterDays" | "startMode">;
}) => {
  //
};
