import { processPartnerGroupChangeJob } from "@/lib/jobs/handlers/process-partner-group-change-job";
import { prisma } from "@/lib/prisma";
import { nanoid, pluck } from "@dub/utils";
import { PartnerGroup, Prisma } from "@prisma/client";
import { waitUntil } from "@vercel/functions";
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
  // Partner page moves one partner and refetches as soon as this request
  // returns. Defaults to true for single-partner moves so the refetch sees
  // cleared link overrides. Workflows / bulk moves leave this to
  // processPartnerGroupChangeJob.
  clearLinkRewardsSync?: boolean;
}

export async function movePartnersToGroup({
  workspaceId,
  programId,
  partnerIds,
  userId,
  group,
  groupMoveDisabledAt,
  clearLinkRewardsSync,
}: MovePartnersToGroupParams): Promise<number> {
  partnerIds = [...new Set(partnerIds)];

  const shouldClearLinkRewardsSync =
    clearLinkRewardsSync ?? partnerIds.length === 1;

  if (partnerIds.length === 0) {
    throw new DubApiError({
      code: "bad_request",
      message: "At least one partner ID is required.",
    });
  }

  const result = await prisma.$transaction(async (tx) => {
    // Partners already in this group are not moved. Still persist the lock
    // when the caller only wants to set or clear groupMoveDisabledAt.
    let alreadyInGroupCount = 0;

    if (groupMoveDisabledAt !== undefined) {
      const updated = await tx.programEnrollment.updateMany({
        where: {
          partnerId: {
            in: partnerIds,
          },
          programId,
          groupId: group.id,
        },
        data: {
          groupMoveDisabledAt,
        },
      });

      alreadyInGroupCount = updated.count;
    }

    const where: Prisma.ProgramEnrollmentWhereInput = {
      partnerId: {
        in: partnerIds,
      },
      programId,
      OR: [{ groupId: { not: group.id } }, { groupId: null }],
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
      if (alreadyInGroupCount === 0) {
        return null;
      }

      return {
        count: alreadyInGroupCount,
        programEnrollmentsAfter: [],
      };
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
      if (alreadyInGroupCount === 0) {
        return null;
      }

      return {
        count: alreadyInGroupCount,
        programEnrollmentsAfter: [],
      };
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

    if (shouldClearLinkRewardsSync) {
      const partnerLinks = await tx.link.findMany({
        where: {
          programId,
          partnerId: {
            in: pluck(programEnrollmentsAfter, "partnerId"),
          },
        },
        select: {
          id: true,
        },
      });

      if (partnerLinks.length > 0) {
        await tx.linkReward.deleteMany({
          where: {
            linkId: {
              in: pluck(partnerLinks, "id"),
            },
          },
        });
      }
    }

    return {
      count: count + alreadyInGroupCount,
      programEnrollmentsAfter,
    };
  });

  if (!result) {
    return 0;
  }

  const { count, programEnrollmentsAfter } = result;
  const movedPartnerIds = pluck(programEnrollmentsAfter, "partnerId");

  if (movedPartnerIds.length === 0) {
    return count;
  }

  waitUntil(
    processPartnerGroupChangeJob.dispatch({
      programId,
      groupId: group.id,
      movedPartnerIds,
      userId,
      idempotencyKey: nanoid(10),
    }),
  );

  return count;
}
