"use server";

import { recordAuditLog } from "@/lib/api/audit-logs/record-audit-log";
import { linkCache } from "@/lib/api/links/cache";
import { syncTotalCommissions } from "@/lib/api/partners/sync-total-commissions";
import { getDefaultProgramIdOrThrow } from "@/lib/api/programs/get-default-program-id-or-throw";
import { getProgramEnrollmentOrThrow } from "@/lib/api/programs/get-program-enrollment-or-throw";
import {
  BAN_PARTNER_REASONS,
  banPartnerSchema,
} from "@/lib/zod/schemas/partners";
import { sendEmail } from "@dub/email";
import PartnerBanned from "@dub/email/templates/partner-banned";
import { prisma } from "@dub/prisma";
import { waitUntil } from "@vercel/functions";
import { authActionClient } from "../safe-action";

// Ban a partner
export const banPartnerAction = authActionClient
  .schema(banPartnerSchema)
  .action(async ({ parsedInput, ctx }) => {
    const { workspace, user } = ctx;
    const { partnerId } = parsedInput;

    const programId = getDefaultProgramIdOrThrow(workspace);

    const programEnrollment = await getProgramEnrollmentOrThrow({
      partnerId,
      programId,
      includePartner: true,
    });

    if (programEnrollment.status === "banned") {
      throw new Error("This partner is already banned.");
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
          status: "banned",
          bannedAt: new Date(),
          bannedReason: parsedInput.reason,
          clickRewardId: null,
          leadRewardId: null,
          saleRewardId: null,
        },
      }),

      prisma.commission.updateMany({
        where,
        data: {
          status: "canceled",
        },
      }),

      prisma.payout.updateMany({
        where,
        data: {
          status: "canceled",
        },
      }),
    ]);

    waitUntil(
      (async () => {
        // sync total commissions
        await syncTotalCommissions({ partnerId, programId });

        const { program, partner } = programEnrollment;

        if (!partner.email) {
          console.error("Partner has no email address.");
          return;
        }

        const supportEmail = program.supportEmail || "support@dub.co";

        // Delete links from cache
        const links = await prisma.link.findMany({
          where,
          select: {
            domain: true,
            key: true,
          },
        });

        await linkCache.deleteMany(links);

        await Promise.allSettled([
          sendEmail({
            subject: `You've been banned from the ${program.name} Partner Program`,
            email: partner.email,
            replyTo: supportEmail,
            react: PartnerBanned({
              partner: {
                name: partner.name,
                email: partner.email,
              },
              program: {
                name: program.name,
                supportEmail,
              },
              bannedReason: BAN_PARTNER_REASONS[parsedInput.reason],
            }),
            variant: "notifications",
          }),

          recordAuditLog({
            workspaceId: workspace.id,
            programId,
            action: "partner.banned",
            description: `Partner ${partnerId} banned`,
            actor: user,
            targets: [
              {
                type: "partner",
                id: partnerId,
                metadata: partner,
              },
            ],
          }),
        ]);
      })(),
    );
  });
