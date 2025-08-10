"use server";

import { recordAuditLog } from "@/lib/api/audit-logs/record-audit-log";
import { linkCache } from "@/lib/api/links/cache";
import { syncTotalCommissions } from "@/lib/api/partners/sync-total-commissions";
import { Session } from "@/lib/auth";
import { BAN_PARTNER_REASONS } from "@/lib/zod/schemas/partners";
import { sendEmail } from "@dub/email";
import PartnerBanned from "@dub/email/templates/partner-banned";
import { prisma } from "@dub/prisma";
import {
  Partner,
  PartnerBannedReason,
  Program,
  Project,
} from "@dub/prisma/client";
import { waitUntil } from "@vercel/functions";

export const banPartner = async ({
  workspace,
  program,
  partner,
  reason,
  user,
  notifyPartner = true,
}: {
  workspace: Pick<Project, "id">;
  program: Pick<Program, "id" | "name" | "supportEmail">;
  partner: Pick<Partner, "id" | "name" | "email">;
  reason: PartnerBannedReason;
  user: Session["user"];
  notifyPartner: boolean;
}) => {
  const where = {
    programId: program.id,
    partnerId: partner.id,
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
        partnerId_programId: {
          partnerId: partner.id,
          programId: program.id,
        },
      },
      data: {
        status: "banned",
        bannedAt: new Date(),
        bannedReason: reason,
        clickRewardId: null,
        leadRewardId: null,
        saleRewardId: null,
        trustedAt: null,
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

    prisma.fraudEvent.updateMany({
      where,
      data: {
        status: "banned",
      },
    }),
  ]);

  waitUntil(
    (async () => {
      await syncTotalCommissions({
        partnerId: partner.id,
        programId: program.id,
      });

      if (!partner.email) {
        console.error("Partner has no email address.");
        return;
      }

      // Delete links from cache
      const links = await prisma.link.findMany({
        where,
        select: {
          domain: true,
          key: true,
        },
      });

      const supportEmail = program.supportEmail || "support@dub.co";

      await Promise.allSettled([
        linkCache.deleteMany(links),

        notifyPartner
          ? sendEmail({
              variant: "notifications",
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
                bannedReason: BAN_PARTNER_REASONS[reason],
              }),
            })
          : Promise.resolve(),

        recordAuditLog({
          workspaceId: workspace.id,
          programId: program.id,
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
        }),
      ]);
    })(),
  );
};
