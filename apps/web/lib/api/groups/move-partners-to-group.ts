import { processPartnerGroupChangeJob } from "@/lib/jobs/handlers/process-partner-group-change-job";
import { prisma } from "@/lib/prisma";
import { pluck } from "@dub/utils";
import { PartnerGroup, Prisma } from "@prisma/client";
import { buildProgramEnrollmentChangeSet } from "../activity-log/build-program-enrollment-change-set";
import { trackActivityLogsTx } from "../activity-log/track-activity-log";
import { DubApiError } from "../errors";

interface MovePartnersToGroupParams {
  workspaceId: string;
  programId: string;
  partnerIds: string[];
  userId: string | null;
  group: Pick<
    PartnerGroup,
    | "id"
    | "name"
    | "clickRewardId"
    | "leadRewardId"
    | "saleRewardId"
    | "referralRewardId"
    | "customRewardId"
    | "discountId"
  >;
  groupMoveDisabledAt?: Date | null;
}

export async function movePartnersToGroup({
  workspaceId,
  programId,
  partnerIds,
  userId,
  group,
  groupMoveDisabledAt,
}: MovePartnersToGroupParams): Promise<number> {
  partnerIds = [...new Set(partnerIds)];

  if (partnerIds.length === 0) {
    throw new DubApiError({
      code: "bad_request",
      message: "At least one partner ID is required.",
    });
  }

  const result = await prisma.$transaction(async (tx) => {
    const where: Prisma.ProgramEnrollmentWhereInput = {
      partnerId: {
        in: partnerIds,
      },
      programId,
      groupId: {
        not: group.id,
      },
    };

    const programEnrollmentsBefore = await tx.programEnrollment.findMany({
      where,
      select: {
        id: true,
        partnerId: true,
        partnerGroup: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    if (programEnrollmentsBefore.length === 0) {
      return null;
    }

    const { count } = await tx.programEnrollment.updateMany({
      where,
      data: {
        groupId: group.id,
        clickRewardId: group.clickRewardId,
        leadRewardId: group.leadRewardId,
        saleRewardId: group.saleRewardId,
        referralRewardId: group.referralRewardId,
        customRewardId: group.customRewardId,
        discountId: group.discountId,
        ...(groupMoveDisabledAt !== undefined && { groupMoveDisabledAt }),
      },
    });

    if (count === 0) {
      return null;
    }

    const programEnrollmentsAfter = await tx.programEnrollment.findMany({
      where: {
        id: {
          in: pluck(programEnrollmentsBefore, "id"),
        },
      },
      select: {
        id: true,
        partnerId: true,
        partnerGroup: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    // Track the activity logs for the program enrollments that were moved to the group
    const enrollmentsBeforeById = new Map(
      programEnrollmentsBefore.map((enrollment) => [enrollment.id, enrollment]),
    );

    const logs = programEnrollmentsAfter.map((newEnrollment) => {
      const oldEnrollment = enrollmentsBeforeById.get(newEnrollment.id);

      return {
        workspaceId,
        programId,
        resourceType: "partner" as const,
        resourceId: newEnrollment.partnerId,
        userId,
        action: "partner.groupChanged" as const,
        changeSet: buildProgramEnrollmentChangeSet({
          oldEnrollment,
          newEnrollment,
        }),
      };
    });

    await trackActivityLogsTx({
      tx,
      logs,
    });

    return {
      count,
      programEnrollmentsAfter,
    };
  });

  if (!result) {
    return 0;
  }

  const { count, programEnrollmentsAfter } = result;
  const movedPartnerIds = pluck(programEnrollmentsAfter, "partnerId");

  await processPartnerGroupChangeJob.dispatch(
    {
      programId,
      groupId: group.id,
      movedPartnerIds,
      userId,
    },
    {
      label: group.id,
    },
  );

  return count;
}
