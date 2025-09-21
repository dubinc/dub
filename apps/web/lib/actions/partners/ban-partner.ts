"use server";

import { recordAuditLog } from "@/lib/api/audit-logs/record-audit-log";
import { enqueueCouponCodeDeleteJobs } from "@/lib/api/discounts/enqueue-coupon-code-delete-jobs";
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
import { ProgramEnrollmentStatus } from "@prisma/client";
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
          status: ProgramEnrollmentStatus.banned,
          bannedAt: new Date(),
          bannedReason: parsedInput.reason,
          groupId: null,
          clickRewardId: null,
          leadRewardId: null,
          saleRewardId: null,
          discountId: null,
        },
      }),

      prisma.commission.updateMany({
        where,
        data: {
          status: "canceled",
        },
      }),

      prisma.payout.updateMany({
        where: {
          ...where,
          status: "pending",
        },
        data: {
          status: "canceled",
        },
      }),
    ]);

    waitUntil(
      (async () => {
        const { program, partner } = programEnrollment;
        const supportEmail = program.supportEmail || "support@dub.co";

        await Promise.allSettled([
          // Sync total commissions
          syncTotalCommissions({ partnerId, programId }),
          // Notify partner

          partner.email &&
            sendEmail({
              subject: `You've been banned from the ${program.name} Partner Program`,
              to: partner.email,
              replyTo: supportEmail,
              react: PartnerBanned({
                partner: {
                  name: partner.name,
                  email: partner.email,
                },
                program: {
                  name: program.name,
                  slug: program.slug,
                },
                bannedReason: BAN_PARTNER_REASONS[parsedInput.reason],
              }),
              variant: "notifications",
            }),

          // Expire links from cache
          linkCache.deleteMany(programEnrollment.links),

          // Enqueue coupon code delete jobs
          enqueueCouponCodeDeleteJobs(programEnrollment.links),

          // Record audit log for each partner
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

          // Send email to the partner
          partner.email &&
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
        ]);
      })(),
    );
  });
