"use server";

import { recordAuditLog } from "@/lib/api/audit-logs/record-audit-log";
import { bulkDeleteLinks } from "@/lib/api/links/bulk-delete-links";
import { getDefaultProgramIdOrThrow } from "@/lib/api/programs/get-default-program-id-or-throw";
import { prisma } from "@dub/prisma";
import { waitUntil } from "@vercel/functions";
import * as z from "zod/v4";
import { authActionClient } from "../safe-action";
import { throwIfNoPermission } from "../throw-if-no-permission";

const deleteProgramInviteSchema = z.object({
  workspaceId: z.string(),
  partnerId: z.string(),
});

export const deleteProgramInviteAction = authActionClient
  .inputSchema(deleteProgramInviteSchema)
  .action(async ({ parsedInput, ctx }) => {
    const { partnerId } = parsedInput;
    const { workspace, user } = ctx;

    throwIfNoPermission({
      role: workspace.role,
      requiredRoles: ["owner", "member"],
    });

    const programId = getDefaultProgramIdOrThrow(workspace);

    const { program, partner, ...programEnrollment } =
      await prisma.programEnrollment.findUniqueOrThrow({
        where: {
          partnerId_programId: {
            partnerId,
            programId,
          },
          status: {
            in: ["invited", "declined"],
          },
        },
        include: {
          program: true,
          partner: true,
          links: true,
          programPartnerTags: {
            include: {
              partnerTag: true,
            },
          },
        },
      });

    if (programEnrollment.totalCommissions > 0) {
      throw new Error("Partner has commissions, cannot delete invite.");
    }

    // only delete links that have don't have sales / leads
    const linksToDelete = programEnrollment.links.filter(
      (link) => link.leads === 0 && link.sales === 0,
    );

    await Promise.allSettled([
      prisma.link.deleteMany({
        where: {
          id: {
            in: linksToDelete.map((link) => link.id),
          },
        },
      }),

      bulkDeleteLinks(
        linksToDelete.map((link) => ({
          ...link,
          programEnrollment: {
            groupId: programEnrollment.groupId,
            programPartnerTags: programEnrollment.programPartnerTags,
          },
        })),
      ),

      prisma.discoveredPartner.delete({
        where: {
          programId_partnerId: {
            partnerId,
            programId,
          },
        },
      }),
    ]);

    await prisma.$transaction([
      prisma.programEnrollment.delete({
        where: {
          id: programEnrollment.id,
        },
      }),

      prisma.project.update({
        where: {
          id: workspace.id,
        },
        data: {
          partnersUsage: {
            decrement: 1,
          },
        },
      }),
    ]);

    waitUntil(
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
    );
  });
