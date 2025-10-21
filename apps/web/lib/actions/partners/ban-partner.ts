"use server";

import { recordAuditLog } from "@/lib/api/audit-logs/record-audit-log";
import { queueDiscountCodeDeletion } from "@/lib/api/discounts/queue-discount-code-deletion";
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
      include: {
        program: true,
        partner: true,
        links: true,
        discountCodes: true,
      },
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

      prisma.bountySubmission.updateMany({
        where: {
          ...where,
          status: {
            not: "approved",
          },
        },
        data: {
          status: "rejected",
        },
      }),

      prisma.discountCode.updateMany({
        where,
        data: {
          discountId: null,
        },
      }),
    ]);

    waitUntil(
      (async () => {
        // Sync total commissions
        await syncTotalCommissions({ partnerId, programId });

        const { program, partner, links, discountCodes } = programEnrollment;

        await Promise.allSettled([
          linkCache.expireMany(links),

          queueDiscountCodeDeletion(discountCodes.map(({ id }) => id)),

          partner.email &&
            sendEmail({
              subject: `You've been banned from the ${program.name} Partner Program`,
              to: partner.email,
              replyTo: program.supportEmail || "noreply",
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
