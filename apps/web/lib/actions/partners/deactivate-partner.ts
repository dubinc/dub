"use server";

import { recordAuditLog } from "@/lib/api/audit-logs/record-audit-log";
import { queueDiscountCodeDeletion } from "@/lib/api/discounts/queue-discount-code-deletion";
import { linkCache } from "@/lib/api/links/cache";
import { getDefaultProgramIdOrThrow } from "@/lib/api/programs/get-default-program-id-or-throw";
import { getProgramEnrollmentOrThrow } from "@/lib/api/programs/get-program-enrollment-or-throw";
import { deactivatePartnerSchema } from "@/lib/zod/schemas/partners";
import { sendEmail } from "@dub/email";
import PartnerDeactivated from "@dub/email/templates/partner-deactivated";
import { prisma } from "@dub/prisma";
import { ProgramEnrollmentStatus } from "@prisma/client";
import { waitUntil } from "@vercel/functions";
import { authActionClient } from "../safe-action";

// Deactivate a partner
export const deactivatePartnerAction = authActionClient
  .schema(deactivatePartnerSchema)
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

    if (programEnrollment.status === "deactivated") {
      throw new Error("This partner is already deactivated.");
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
          status: ProgramEnrollmentStatus.deactivated,
        },
      }),
    ]);

    waitUntil(
      (async () => {
        const { program, partner, links, discountCodes } = programEnrollment;

        await Promise.allSettled([
          partner.email &&
            sendEmail({
              subject: `Your partnership with ${program.name} has been deactivated`,
              to: partner.email,
              replyTo: program.supportEmail || "noreply",
              react: PartnerDeactivated({
                partner: {
                  name: partner.name,
                  email: partner.email,
                },
                program: {
                  name: program.name,
                  slug: program.slug,
                },
              }),
              variant: "notifications",
            }),
          linkCache.expireMany(links),
          queueDiscountCodeDeletion(discountCodes.map(({ id }) => id)),
          recordAuditLog({
            workspaceId: workspace.id,
            programId,
            action: "partner.deactivated",
            description: `Partner ${partnerId} deactivated`,
            actor: user,
            targets: [
              {
                type: "partner",
                id: partnerId,
                metadata: programEnrollment.partner,
              },
            ],
          }),
        ]);
      })(),
    );
  });
