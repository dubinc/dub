"use server";

import { recordAuditLog } from "@/lib/api/audit-logs/record-audit-log";
import { linkCache } from "@/lib/api/links/cache";
import { getDefaultProgramIdOrThrow } from "@/lib/api/programs/get-default-program-id-or-throw";
import { getProgramEnrollmentOrThrow } from "@/lib/api/programs/get-program-enrollment-or-throw";
import { deactivatePartnerSchema } from "@/lib/zod/schemas/partners";
import { prisma } from "@dub/prisma";
import { ProgramEnrollmentStatus } from "@prisma/client";
import { waitUntil } from "@vercel/functions";
import { authActionClient } from "../safe-action";

// Deactivate a partner
export const deactivatePartnerAction = authActionClient
  .schema(deactivatePartnerSchema)
  .action(async ({ parsedInput, ctx }) => {
    const { workspace, user } = ctx;
    const { partnerId } = parsedInput;

    const programId = getDefaultProgramIdOrThrow(workspace);

    const programEnrollment = await getProgramEnrollmentOrThrow({
      partnerId,
      programId,
      includePartner: true,
    });

    if (programEnrollment.status === "deactivated") {
      throw new Error("This partner is already deactivated.");
    }

    const where = {
      programId,
      partnerId,
    };

    await prisma.$transaction([
      prisma.link.updateMany({
        where,
        data: {
          expiresAt: new Date(),
        },
      }),

      prisma.programEnrollment.update({
        where: {
          partnerId_programId: where,
        },
        data: {
          status: ProgramEnrollmentStatus.deactivated,
        },
      }),
    ]);

    waitUntil(
      (async () => {
        // Expire links from cache
        const links = await prisma.link.findMany({
          where,
          select: {
            domain: true,
            key: true,
          },
        });

        await Promise.allSettled([
          // TODO send email to partner
          linkCache.expireMany(links),
          recordAuditLog({
            workspaceId: workspace.id,
            programId,
            action: "partner.deactivated",
            description: `Partner ${partnerId} deactivated`,
            actor: user,
            targets: [
              {
                type: "partner",
                id: partnerId,
                metadata: programEnrollment.partner,
              },
            ],
          }),
        ]);
      })(),
    );
  });
