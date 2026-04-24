"use server";

import { trackActivityLog } from "@/lib/api/activity-log/track-activity-log";
import { getDefaultProgramIdOrThrow } from "@/lib/api/programs/get-default-program-id-or-throw";
import { getProgramEnrollmentOrThrow } from "@/lib/api/programs/get-program-enrollment-or-throw";
import { archivePartnerSchema } from "@/lib/zod/schemas/partners";
import { prisma } from "@dub/prisma";
import { waitUntil } from "@vercel/functions";
import { authActionClient } from "../safe-action";
import { throwIfNoPermission } from "../throw-if-no-permission";

// Archive a partner
export const archivePartnerAction = authActionClient
  .inputSchema(archivePartnerSchema)
  .action(async ({ parsedInput, ctx }) => {
    const { workspace, user } = ctx;
    const { partnerId } = parsedInput;

    throwIfNoPermission({
      role: workspace.role,
      requiredRoles: ["owner", "member"],
    });

    const programId = getDefaultProgramIdOrThrow(workspace);

    const programEnrollment = await getProgramEnrollmentOrThrow({
      partnerId,
      programId,
      include: {},
    });

    const { status } = await prisma.programEnrollment.update({
      where: {
        partnerId_programId: {
          partnerId,
          programId,
        },
      },
      data: {
        status:
          programEnrollment.status === "archived" ? "approved" : "archived",
      },
      include: {
        partner: true,
      },
    });

    waitUntil(
      trackActivityLog({
        workspaceId: workspace.id,
        programId,
        resourceType: "partner",
        resourceId: partnerId,
        userId: user.id,
        action:
          status === "archived" ? "partner.archived" : "partner.unarchived",
        changeSet: {
          status: {
            old: programEnrollment.status,
            new: status,
          },
        },
      }),
    );
  });
