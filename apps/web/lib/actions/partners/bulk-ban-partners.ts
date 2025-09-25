"use server";

import { recordAuditLog } from "@/lib/api/audit-logs/record-audit-log";
import { queueStripeDiscountCodeDisable } from "@/lib/api/discounts/queue-discount-code-deletion";
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
            domain: true,
            key: true,
            discountCode: true,
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
        // Sync total commissions for each partner
        await Promise.allSettled(
          programEnrollments.map(({ partner }) =>
            syncTotalCommissions({
              partnerId: partner.id,
              programId,
            }),
          ),
        );

        const links = programEnrollments.flatMap(({ links }) => links);

        // Expire links from cache
        await linkCache.expireMany(links);

        // Queue discount code deletions
        await Promise.allSettled(
          links.map((link) =>
            queueStripeDiscountCodeDisable(link.discountCode?.id),
          ),
        );

        // Record audit log for each partner
        await recordAuditLog(
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
        );

        // Send email
        const program = await prisma.program.findUniqueOrThrow({
          where: {
            id: programId,
          },
          select: {
            name: true,
            slug: true,
          },
        });

        await sendBatchEmail(
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
        );
      })(),
    );
  });
