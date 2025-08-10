"use server";

import { recordAuditLog } from "@/lib/api/audit-logs/record-audit-log";
import { linkCache } from "@/lib/api/links/cache";
import { Session } from "@/lib/auth";
import { prisma } from "@dub/prisma";
import { Partner, Program, Project } from "@dub/prisma/client";
import { waitUntil } from "@vercel/functions";

export const unbanPartner = async ({
  workspace,
  program,
  partner,
  user,
}: {
  workspace: Pick<Project, "id">;
  program: Pick<Program, "id" | "name" | "supportEmail">;
  partner: Pick<Partner, "id" | "name" | "email">;
  user: Session["user"];
}) => {
  const where = {
    programId: program.id,
    partnerId: partner.id,
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
        partnerId_programId: {
          partnerId: partner.id,
          programId: program.id,
        },
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
        linkCache.deleteMany(links),

        recordAuditLog({
          workspaceId: workspace.id,
          programId: program.id,
          action: "partner.unbanned",
          description: `Partner ${partner.id} unbanned`,
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
