"use server";

import { recordAuditLog } from "@/lib/api/audit-logs/record-audit-log";
import { queueDiscountCodeDeletion } from "@/lib/api/discounts/queue-discount-code-deletion";
import { createFraudEventGroupKey } from "@/lib/api/fraud/utils";
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
import { nanoid } from "@dub/utils";
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
          groupId: null,
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

        const { program, partner, links, discountCodes } = programEnrollment;

        // Resolve pending fraud events for this partner
        const fraudEvents = await prisma.fraudEvent.findMany({
          where: {
            programId,
            partnerId,
            status: "pending",
          },
          select: {
            id: true,
            groupKey: true,
            partnerId: true,
            type: true,
          },
        });

        // Group events by their existing groupKey
        const groupedEvents = new Map<string, typeof fraudEvents>();

        for (const event of fraudEvents) {
          if (!groupedEvents.has(event.groupKey)) {
            groupedEvents.set(event.groupKey, []);
          }

          groupedEvents.get(event.groupKey)!.push(event);
        }

        // Update each group with a new groupKey and mark as resolved
        for (const [groupKey, events] of groupedEvents) {
          if (events.length === 0) continue;

          const firstEvent = events[0];
          const newGroupKey = createFraudEventGroupKey({
            programId,
            partnerId: firstEvent.partnerId,
            type: firstEvent.type,
            batchId: nanoid(10),
          });

          await prisma.fraudEvent.updateMany({
            where: {
              groupKey,
              status: "pending",
            },
            data: {
              status: "resolved",
              userId: user.id,
              resolvedAt: new Date(),
              resolutionReason:
                "Resolved automatically because the partner was banned.",
              groupKey: newGroupKey,
            },
          });
        }

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
