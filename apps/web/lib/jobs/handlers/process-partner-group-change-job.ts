import { getWorkspaceUsers } from "@/lib/api/get-workspace-users";
import { includeProgramEnrollment } from "@/lib/api/links/include-program-enrollment";
import { includeTags } from "@/lib/api/links/include-tags";
import { notifyPartnerGroupChange } from "@/lib/api/partners/notify-partner-group-change";
import { queuePartnerSearchSync } from "@/lib/api/partners/queue-partner-search-sync";
import { triggerDraftBountySubmissionCreation } from "@/lib/bounty/api/trigger-draft-bounty-submissions";
import { qstash } from "@/lib/cron";
import { prisma } from "@/lib/prisma";
import { recordLink } from "@/lib/tinybird";
import { APP_DOMAIN_WITH_NGROK, pluck } from "@dub/utils";
import { ProgramEnrollmentStatus, WorkspaceRole } from "@prisma/client";
import * as z from "zod/v4";
import { defineJob } from "../index";

const inputSchema = z.object({
  programId: z.string(),
  groupId: z.string(),
  movedPartnerIds: z.array(z.string()).min(1),
  userId: z.string().nullable(),
});

// Side effects after partners are moved to a group: search sync, remap default
// links / discount codes, Tinybird link records, draft bounties, and notify.
export const processPartnerGroupChangeJob = defineJob({
  name: "process-partner-group-change-job",
  schema: inputSchema,
  async handle({ programId, groupId, movedPartnerIds, userId }) {
    const [partnerLinks, programEnrollments] = await Promise.all([
      prisma.link.findMany({
        where: {
          programId,
          partnerId: {
            in: movedPartnerIds,
          },
        },
        include: {
          ...includeTags,
          ...includeProgramEnrollment,
        },
      }),

      prisma.programEnrollment.findMany({
        where: {
          programId,
          partnerId: {
            in: movedPartnerIds,
          },
        },
        select: {
          partnerId: true,
          status: true,
        },
      }),
    ]);

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

    const activeProgramEnrollments = programEnrollments.filter(
      ({ status }) => status !== ProgramEnrollmentStatus.pending,
    );

    await Promise.all([
      // Queue an index update because the enrollments moved group (filterable field)
      queuePartnerSearchSync({
        partnerIds: movedPartnerIds,
        programId,
      }),

      qstash.publishJSON({
        url: `${APP_DOMAIN_WITH_NGROK}/api/cron/groups/remap-default-links`,
        body: {
          programId,
          groupId,
          partnerIds: pluck(activeProgramEnrollments, "partnerId"),
          userId: workspaceUserId,
        },
      }),

      triggerDraftBountySubmissionCreation({
        programId,
        partnerIds: movedPartnerIds,
      }),

      recordLink(partnerLinks),

      notifyPartnerGroupChange({
        programId,
        groupId,
        partnerIds: movedPartnerIds,
      }),
    ]);
  },
});
