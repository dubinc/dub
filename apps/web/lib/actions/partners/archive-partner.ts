"use server";

import { recordAuditLog } from "@/lib/api/audit-logs/record-audit-log";
import { getDefaultProgramIdOrThrow } from "@/lib/api/programs/get-default-program-id-or-throw";
import { getProgramEnrollmentOrThrow } from "@/lib/api/programs/get-program-enrollment-or-throw";
import { archivePartnerSchema } from "@/lib/zod/schemas/partners";
import { prisma } from "@dub/prisma";
import { waitUntil } from "@vercel/functions";
import { authActionClient } from "../safe-action";

// Archive a partner
export const archivePartnerAction = authActionClient
  .schema(archivePartnerSchema)
  .action(async ({ parsedInput, ctx }) => {
    const { workspace, user } = ctx;
    const { partnerId } = parsedInput;

    const programId = getDefaultProgramIdOrThrow(workspace);

    const programEnrollment = await getProgramEnrollmentOrThrow({
      partnerId,
      programId,
    });

    const { status, partner } = await prisma.programEnrollment.update({
      where: {
        partnerId_programId: {
          programId,
          partnerId,
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
      recordAuditLog({
        workspaceId: workspace.id,
        programId,
        action: status === "archived" ? "partner.archived" : "partner.approved",
        description: `Partner ${partnerId} ${status}`,
        actor: user,
        targets: [
          {
            type: "partner",
            id: partnerId,
            metadata: partner,
          },
        ],
      }),
    );
  });
