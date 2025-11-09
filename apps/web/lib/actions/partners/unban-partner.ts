"use server";

import { recordAuditLog } from "@/lib/api/audit-logs/record-audit-log";
import { getGroupOrThrow } from "@/lib/api/groups/get-group-or-throw";
import { linkCache } from "@/lib/api/links/cache";
import { includeProgramEnrollment } from "@/lib/api/links/include-program-enrollment";
import { includeTags } from "@/lib/api/links/include-tags";
import { getDefaultProgramIdOrThrow } from "@/lib/api/programs/get-default-program-id-or-throw";
import { recordLink } from "@/lib/tinybird";
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

    const where = {
      programId,
      partnerId,
    };

    const programEnrollment = await prisma.programEnrollment.findUniqueOrThrow({
      where: {
        partnerId_programId: where,
      },
      include: {
        program: true,
        partner: true,
      },
    });

    if (programEnrollment.status !== "banned") {
      throw new Error("This partner is not banned.");
    }

    if (!programEnrollment.program.defaultGroupId) {
      // this should never happen
      throw new Error(
        "Program does not have a default group ID. Please contact support.",
      );
    }

    const defaultGroup = await getGroupOrThrow({
      programId,
      groupId: programEnrollment.program.defaultGroupId,
    });

    await prisma.$transaction([
      prisma.link.updateMany({
        where,
        data: {
          disabledAt: null,
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
          groupId: defaultGroup.id,
          clickRewardId: defaultGroup.clickRewardId,
          leadRewardId: defaultGroup.leadRewardId,
          saleRewardId: defaultGroup.saleRewardId,
          discountId: defaultGroup.discountId,
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

      prisma.bountySubmission.updateMany({
        where: {
          ...where,
          status: "rejected",
        },
        data: {
          status: "submitted",
        },
      }),
    ]);

    waitUntil(
      (async () => {
        const links = await prisma.link.findMany({
          where,
          include: {
            ...includeTags,
            ...includeProgramEnrollment,
          },
        });

        await Promise.allSettled([
          // Expire links from cache
          linkCache.expireMany(links),

          // Update Tinybird links metadata
          recordLink(links),

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
