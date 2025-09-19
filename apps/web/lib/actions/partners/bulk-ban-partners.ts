"use server";

import { recordAuditLog } from "@/lib/api/audit-logs/record-audit-log";
import { enqueueCouponCodeDeleteJobs } from "@/lib/api/discounts/enqueue-coupon-code-delete-jobs";
import { linkCache } from "@/lib/api/links/cache";
import { syncTotalCommissions } from "@/lib/api/partners/sync-total-commissions";
import { getDefaultProgramIdOrThrow } from "@/lib/api/programs/get-default-program-id-or-throw";
import {
  BAN_PARTNER_REASONS,
  bulkBanPartnersSchema,
} from "@/lib/zod/schemas/partners";
import { sendBatchEmail } from "@dub/email";
import PartnerBanned from "@dub/email/templates/partner-banned";
import { prisma } from "@dub/prisma";
import { ProgramEnrollmentStatus } from "@prisma/client";
import { waitUntil } from "@vercel/functions";
import { authActionClient } from "../safe-action";

export const bulkBanPartnersAction = authActionClient
  .schema(bulkBanPartnersSchema)
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
          not: "banned",
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
        links: {
          select: {
            id: true,
            domain: true,
            key: true,
            couponCode: true,
            projectId: true,
          },
        },
      },
    });

    if (programEnrollments.length === 0) {
      throw new Error("You must provide at least one valid partner ID.");
    }

    const commonWhere = {
      programId,
      partnerId: {
        in: partnerIds,
      },
    };

    await prisma.$transaction([
      prisma.programEnrollment.updateMany({
        where: {
          ...commonWhere,
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

      prisma.link.updateMany({
        where: {
          ...commonWhere,
        },
        data: {
          expiresAt: new Date(),
        },
      }),

      prisma.commission.updateMany({
        where: {
          ...commonWhere,
          status: "pending",
        },
        data: {
          status: "canceled",
        },
      }),

      prisma.payout.updateMany({
        where: {
          ...commonWhere,
          status: "pending",
        },
        data: {
          status: "canceled",
        },
      }),
    ]);

    waitUntil(
      (async () => {
        const program = await prisma.program.findUniqueOrThrow({
          where: {
            id: programId,
          },
          select: {
            name: true,
            slug: true,
          },
        });

        const links = programEnrollments.flatMap(({ links }) => links);

        await Promise.allSettled([
          // Sync total commissions for each partner
          ...programEnrollments.map(({ partner }) =>
            syncTotalCommissions({
              partnerId: partner.id,
              programId,
            }),
          ),

          sendBatchEmail(
            programEnrollments
              .filter(({ partner }) => partner.email)
              .map(({ partner }) => ({
                to: partner.email!,
                subject: `You've been banned from the ${program.name} Partner Program`,
                variant: "notifications",
                react: PartnerBanned({
                  partner: {
                    name: partner.name,
                    email: partner.email!,
                  },
                  program: {
                    name: program.name,
                    slug: program.slug,
                  },
                  bannedReason: BAN_PARTNER_REASONS[parsedInput.reason],
                }),
              })),
          ),

          // Expire links from cache
          linkCache.deleteMany(links),

          // Enqueue coupon code delete jobs
          enqueueCouponCodeDeleteJobs(links),

          // Record audit log for each partner
          recordAuditLog(
            programEnrollments.map(({ partner }) => ({
              workspaceId: workspace.id,
              programId,
              action: "partner.banned",
              description: `Partner ${partner.id} banned`,
              actor: user,
              targets: [
                {
                  type: "partner",
                  id: partner.id,
                  metadata: partner,
                },
              ],
            })),
          ),
        ]);
      })(),
    );
  });
