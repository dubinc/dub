"use server";

import { trackActivityLog } from "@/lib/api/activity-log/track-activity-log";
import { queuePartnerSearchSync } from "@/lib/api/partners/queue-partner-search-sync";
import { getDefaultProgramIdOrThrow } from "@/lib/api/programs/get-default-program-id-or-throw";
import { prisma } from "@/lib/prisma";
import {
  ACTIVE_ENROLLMENT_STATUSES,
  bulkArchivePartnersSchema,
} from "@/lib/zod/schemas/partners";
import { waitUntil } from "@vercel/functions";
import { authActionClient } from "../safe-action";
import { throwIfNoPermission } from "../throw-if-no-permission";

export const bulkArchivePartnersAction = authActionClient
  .inputSchema(bulkArchivePartnersSchema)
  .action(async ({ parsedInput, ctx }) => {
    const { workspace, user } = ctx;
    const { partnerIds } = parsedInput;

    throwIfNoPermission({
      role: workspace.role,
      requiredRoles: ["owner", "member"],
    });

    const programId = getDefaultProgramIdOrThrow(workspace);

    const programEnrollments = await prisma.programEnrollment.findMany({
      where: {
        partnerId: {
          in: partnerIds,
        },
        programId,
        status: {
          in: ACTIVE_ENROLLMENT_STATUSES,
        },
      },
      select: {
        id: true,
        partnerId: true,
        status: true,
        partner: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    if (programEnrollments.length === 0) {
      throw new Error("You must provide at least one valid partner ID.");
    }

    await prisma.programEnrollment.updateMany({
      where: {
        partnerId: {
          in: partnerIds,
        },
        programId,
      },
      data: {
        status: "archived",
      },
    });

    waitUntil(
      Promise.allSettled([
        trackActivityLog(
          programEnrollments.map(({ partnerId, status }) => ({
            workspaceId: workspace.id,
            programId,
            resourceType: "partner",
            resourceId: partnerId,
            userId: user.id,
            action: "partner.archived",
            changeSet: {
              status: {
                old: status,
                new: "archived",
              },
            },
          })),
        ),

        // Queue an index update because the enrollment statuses moved to
        // archived. Scoped to the updateMany above, not the findMany, which is
        // narrowed to ACTIVE_ENROLLMENT_STATUSES.
        queuePartnerSearchSync({ partnerIds, programId }),
      ]),
    );
  });
