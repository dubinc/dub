"use server";

import { recordAuditLog } from "@/lib/api/audit-logs/record-audit-log";
import { linkCache } from "@/lib/api/links/cache";
import { getDefaultProgramIdOrThrow } from "@/lib/api/programs/get-default-program-id-or-throw";
import { getProgramEnrollmentOrThrow } from "@/lib/api/programs/get-program-enrollment-or-throw";
import { banPartnerSchema } from "@/lib/zod/schemas/partners";
import { prisma } from "@dub/prisma";
import { waitUntil } from "@vercel/functions";
import { authActionClient } from "../safe-action";

const unbanPartnerSchema = banPartnerSchema.omit({
  reason: true,
});

// Unban a partner
export const unbanPartnerAction = authActionClient
  .schema(unbanPartnerSchema)
  .action(async ({ parsedInput, ctx }) => {
    const { workspace, user } = ctx;
    const { partnerId } = parsedInput;

    const programId = getDefaultProgramIdOrThrow(workspace);

    const programEnrollment = await getProgramEnrollmentOrThrow({
      partnerId,
      programId,
      includePartner: true,
    });

    if (programEnrollment.status !== "banned") {
      throw new Error("This partner is not banned.");
    }

    const where = {
      programId,
      partnerId,
    };

    await prisma.$transaction([
      prisma.link.updateMany({
        where,
        data: {
          expiresAt: null,
        },
      }),

      prisma.programEnrollment.update({
        where: {
          partnerId_programId: where,
        },
        data: {
          status: "approved",
          bannedAt: null,
          bannedReason: null,
        },
      }),

      prisma.commission.updateMany({
        where: {
          ...where,
          status: "canceled",
        },
        data: {
          status: "pending",
        },
      }),

      prisma.payout.updateMany({
        where: {
          ...where,
          status: "canceled",
        },
        data: {
          status: "pending",
        },
      }),
    ]);

    waitUntil(
      (async () => {
        const links = await prisma.link.findMany({
          where,
          select: {
            domain: true,
            key: true,
          },
        });

        await Promise.allSettled([
          // Delete links from cache
          linkCache.deleteMany(links),

          recordAuditLog({
            workspaceId: workspace.id,
            programId,
            action: "partner.unbanned",
            description: `Partner ${partnerId} unbanned`,
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

        // TODO
        // Send email to partner about being unbanned
      })(),
    );
  });
