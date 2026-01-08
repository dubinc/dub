"use server";

import { recordAuditLog } from "@/lib/api/audit-logs/record-audit-log";
import { getDefaultProgramIdOrThrow } from "@/lib/api/programs/get-default-program-id-or-throw";
import { bulkArchivePartnersSchema } from "@/lib/zod/schemas/partners";
import { prisma } from "@dub/prisma";
import { waitUntil } from "@vercel/functions";
import { authActionClient } from "../safe-action";

export const bulkArchivePartnersAction = authActionClient
  .inputSchema(bulkArchivePartnersSchema)
  .action(async ({ parsedInput, ctx }) => {
    const { workspace, user } = ctx;
    const { partnerIds } = parsedInput;

    const programId = getDefaultProgramIdOrThrow(workspace);

    const programEnrollments = await prisma.programEnrollment.findMany({
      where: {
        partnerId: {
          in: partnerIds,
        },
        programId,
        status: {
          not: "archived",
        },
      },
      select: {
        id: true,
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
      (async () => {
        // Record audit log for each partner
        await recordAuditLog(
          programEnrollments.map(({ partner }) => ({
            workspaceId: workspace.id,
            programId,
            action: "partner.archived",
            description: `Partner ${partner.id} archived`,
            actor: user,
            targets: [
              {
                type: "partner",
                id: partner.id,
                metadata: partner,
              },
            ],
          })),
        );
      })(),
    );
  });
