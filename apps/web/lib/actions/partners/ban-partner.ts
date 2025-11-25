"use server";

import { recordAuditLog } from "@/lib/api/audit-logs/record-audit-log";
import { queueDiscountCodeDeletion } from "@/lib/api/discounts/queue-discount-code-deletion";
import { createFraudEvents } from "@/lib/api/fraud/create-fraud-events";
import { resolveFraudEvents } from "@/lib/api/fraud/resolve-fraud-events";
import { linkCache } from "@/lib/api/links/cache";
import { includeTags } from "@/lib/api/links/include-tags";
import { syncTotalCommissions } from "@/lib/api/partners/sync-total-commissions";
import { getDefaultProgramIdOrThrow } from "@/lib/api/programs/get-default-program-id-or-throw";
import { getProgramEnrollmentOrThrow } from "@/lib/api/programs/get-program-enrollment-or-throw";
import { recordLink } from "@/lib/tinybird";
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
        links: {
          include: includeTags,
        },
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
          disabledAt: new Date(),
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
          clickRewardId: null,
          leadRewardId: null,
          saleRewardId: null,
          discountId: null,
        },
      }),

      prisma.commission.updateMany({
        where: {
          ...where,
          status: "pending",
        },
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

        const programEnrollments = await prisma.programEnrollment.findMany({
          where: {
            partnerId,
            programId: {
              not: programId,
            },
            status: {
              in: ["approved"],
            },
          },
        });

        await Promise.allSettled([
          // Automatically resolve all pending fraud events for this partner in the current program
          resolveFraudEvents({
            where: {
              programId,
              partnerId,
            },
            userId: user.id,
            resolutionReason:
              "Resolved automatically because the partner was banned.",
          }),

          // Create partnerCrossProgramBan fraud events for other programs where this partner
          // is enrolled and approved, to flag potential cross-program fraud risk
          createFraudEvents(
            programEnrollments.map(({ programId }) => ({
              programId,
              partnerId,
              type: "partnerCrossProgramBan",
            })),
          ),
        ]);

        const { program, partner, links, discountCodes } = programEnrollment;

        await Promise.allSettled([
          // Expire links from cache
          linkCache.expireMany(links),

          // Delete links from Tinybird links metadata
          recordLink(links, { deleted: true }),

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
