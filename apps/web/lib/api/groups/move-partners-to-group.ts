import { triggerDraftBountySubmissionCreation } from "@/lib/bounty/api/trigger-draft-bounty-submissions";
import { qstash } from "@/lib/cron";
import { recordLink } from "@/lib/tinybird";
import { prisma } from "@dub/prisma";
import { PartnerGroup, WorkspaceRole } from "@dub/prisma/client";
import { APP_DOMAIN_WITH_NGROK } from "@dub/utils";
import { waitUntil } from "@vercel/functions";
import { buildProgramEnrollmentChangeSet } from "../activity-log/build-program-enrollment-change-set";
import {
  trackActivityLog,
  TrackActivityLogInput,
} from "../activity-log/track-activity-log";
import { getWorkspaceUsers } from "../get-workspace-users";
import { includeProgramEnrollment } from "../links/include-program-enrollment";
import { includeTags } from "../links/include-tags";
import { notifyPartnerGroupChange } from "../partners/notify-partner-group-change";

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
    | "discountId"
  >;
  isGroupDeleted?: boolean;
}

export async function movePartnersToGroup({
  workspaceId,
  programId,
  partnerIds,
  userId,
  group,
  isGroupDeleted = false,
}: MovePartnersToGroupParams): Promise<number> {
  if (partnerIds.length === 0) {
    return 0;
  }

  const programEnrollments = await prisma.programEnrollment.findMany({
    where: {
      partnerId: {
        in: partnerIds,
      },
      programId,
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

  if (programEnrollments.length === 0) {
    return 0;
  }

  partnerIds = programEnrollments.map(({ partnerId }) => partnerId);

  const { count } = await prisma.programEnrollment.updateMany({
    where: {
      partnerId: {
        in: partnerIds,
      },
      programId,
    },
    data: {
      groupId: group.id,
      clickRewardId: group.clickRewardId,
      leadRewardId: group.leadRewardId,
      saleRewardId: group.saleRewardId,
      discountId: group.discountId,
    },
  });

  if (count === 0) {
    return 0;
  }

  waitUntil(
    (async () => {
      const partnerLinks = await prisma.link.findMany({
        where: {
          programId,
          partnerId: {
            in: partnerIds,
          },
        },
        include: {
          ...includeTags,
          ...includeProgramEnrollment,
        },
      });

      const updatedProgramEnrollments = await prisma.programEnrollment.findMany(
        {
          where: {
            partnerId: {
              in: partnerIds,
            },
            programId,
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
        },
      );

      // Build activity log inputs
      const activityLogInputs: TrackActivityLogInput[] =
        updatedProgramEnrollments.map((updatedEnrollment) => {
          const oldEnrollment = programEnrollments.find(
            (e) => e.id === updatedEnrollment.id,
          );

          return {
            workspaceId,
            programId,
            resourceType: "partner",
            resourceId: updatedEnrollment.partnerId,
            userId,
            action: "partner.groupChanged",
            changeSet: buildProgramEnrollmentChangeSet({
              oldEnrollment,
              newEnrollment: updatedEnrollment,
            }),
          };
        });

      // If the userId is not provided, get the workspace user id from the workspace users
      // userId will be null for workflow-initiated actions
      let workspaceUserId = userId;

      if (!workspaceUserId) {
        const { users } = await getWorkspaceUsers({
          programId,
          role: WorkspaceRole.owner,
        });

        if (users.length > 0) {
          workspaceUserId = users[0].id;
        }
      }

      await Promise.allSettled([
        qstash.publishJSON({
          url: `${APP_DOMAIN_WITH_NGROK}/api/cron/groups/remap-default-links`,
          body: {
            programId,
            groupId: group.id,
            partnerIds,
            userId: workspaceUserId,
            isGroupDeleted,
          },
        }),

        triggerDraftBountySubmissionCreation({
          programId,
          partnerIds,
        }),

        recordLink(partnerLinks),

        notifyPartnerGroupChange({
          programId,
          groupId: group.id,
          partnerIds,
        }),

        trackActivityLog(activityLogInputs),
      ]);
    })(),
  );

  return count;
}
