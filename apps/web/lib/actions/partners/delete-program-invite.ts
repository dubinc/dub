"use server";

import { recordAuditLog } from "@/lib/api/audit-logs/record-audit-log";
import { bulkDeleteLinks } from "@/lib/api/links/bulk-delete-links";
import { getDefaultProgramIdOrThrow } from "@/lib/api/programs/get-default-program-id-or-throw";
import { prisma } from "@dub/prisma";
import z from "../../zod";
import { authActionClient } from "../safe-action";

const deleteProgramInviteSchema = z.object({
  workspaceId: z.string(),
  partnerId: z.string(),
});

export const deleteProgramInviteAction = authActionClient
  .schema(deleteProgramInviteSchema)
  .action(async ({ parsedInput, ctx }) => {
    const { partnerId } = parsedInput;
    const { workspace, user } = ctx;

    const programId = getDefaultProgramIdOrThrow(workspace);

    const { program, partner, ...programEnrollment } =
      await prisma.programEnrollment.findUniqueOrThrow({
        where: {
          partnerId_programId: {
            partnerId,
            programId,
          },
        },
        include: {
          program: true,
          partner: true,
          links: true,
        },
      });

    if (programEnrollment.status !== "invited") {
      throw new Error("Invite not found.");
    }

    // only delete links that have don't have sales / leads
    const linksToDelete = programEnrollment.links.filter(
      (link) => link.leads === 0 && link.sales === 0,
    );

    await Promise.allSettled([
      prisma.programEnrollment.delete({
        where: {
          id: programEnrollment.id,
        },
      }),

      prisma.link.deleteMany({
        where: { id: { in: linksToDelete.map((link) => link.id) } },
      }),

      bulkDeleteLinks(linksToDelete),

      recordAuditLog({
        workspaceId: workspace.id,
        programId,
        action: "partner.invite_deleted",
        description: `Partner ${partner.id} invite deleted`,
        actor: user,
        targets: [
          {
            type: "partner",
            id: partner.id,
            metadata: partner,
          },
        ],
      }),
    ]);
  });
