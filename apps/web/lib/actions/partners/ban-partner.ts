"use server";

import { linkCache } from "@/lib/api/links/cache";
import { getProgramEnrollmentOrThrow } from "@/lib/api/programs/get-program-enrollment-or-throw";
import {
  BAN_PARTNER_REASONS,
  banPartnerSchema,
} from "@/lib/zod/schemas/partners";
import { sendEmail } from "@dub/email";
import { PartnerBanned } from "@dub/email/templates/partner-banned";
import { prisma } from "@dub/prisma";
import { waitUntil } from "@vercel/functions";
import { authActionClient } from "../safe-action";

// Ban a partner
export const banPartnerAction = authActionClient
  .schema(banPartnerSchema)
  .action(async ({ parsedInput, ctx }) => {
    const { workspace } = ctx;
    const { programId, partnerId } = parsedInput;

    const programEnrollment = await getProgramEnrollmentOrThrow({
      partnerId,
      programId,
    });

    const { program } = programEnrollment;

    if (program.workspaceId !== workspace.id) {
      throw new Error("You are not authorized to ban this partner.");
    }

    if (programEnrollment.status === "banned") {
      throw new Error("This partner is already banned.");
    }

    const where = {
      partnerId,
      programId,
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
        },
      }),

      prisma.commission.updateMany({
        where,
        data: {
          status: "cancelled",
        },
      }),

      prisma.payout.updateMany({
        where,
        data: {
          status: "cancelled",
        },
      }),
    ]);

    waitUntil(
      (async () => {
        // Delete links from cache
        const links = await prisma.link.findMany({
          where,
          select: {
            domain: true,
            key: true,
          },
        });

        await linkCache.deleteMany(links);

        // Send email to partner
        const [partner, workspaceUsers] = await Promise.all([
          prisma.partner.findUniqueOrThrow({
            where: {
              id: partnerId,
            },
            select: {
              email: true,
              name: true,
            },
          }),

          prisma.projectUsers.findMany({
            where: {
              projectId: workspace.id,
              role: "owner",
              user: {
                email: {
                  not: null,
                },
              },
            },
            include: {
              user: {
                select: {
                  email: true,
                },
              },
            },
          }),
        ]);

        if (!partner.email) {
          console.error("Partner has no email address.");
          return;
        }

        const supportEmail = workspaceUsers[0]?.user.email || "support@dub.co";

        sendEmail({
          subject: "Your partner account has been banned",
          email: partner.email,
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
        });
      })(),
    );
  });
