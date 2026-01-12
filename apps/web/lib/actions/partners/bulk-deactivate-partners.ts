"use server";

import { recordAuditLog } from "@/lib/api/audit-logs/record-audit-log";
import { queueDiscountCodeDeletion } from "@/lib/api/discounts/queue-discount-code-deletion";
import { linkCache } from "@/lib/api/links/cache";
import { getDefaultProgramIdOrThrow } from "@/lib/api/programs/get-default-program-id-or-throw";
import { bulkDeactivatePartnersSchema } from "@/lib/zod/schemas/partners";
import { sendEmail } from "@dub/email";
import PartnerDeactivated from "@dub/email/templates/partner-deactivated";
import { prisma } from "@dub/prisma";
import { ProgramEnrollmentStatus } from "@dub/prisma/client";
import { waitUntil } from "@vercel/functions";
import { authActionClient } from "../safe-action";

export const bulkDeactivatePartnersAction = authActionClient
  .inputSchema(bulkDeactivatePartnersSchema)
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
          notIn: ["deactivated", "banned"],
        },
      },
      include: {
        program: true,
        partner: true,
        links: true,
        discountCodes: true,
      },
    });

    if (programEnrollments.length === 0) {
      throw new Error("You must provide at least one valid partner ID.");
    }

    const partnerIdsToDeactivate = programEnrollments.map((pe) => pe.partnerId);

    await prisma.$transaction([
      prisma.link.updateMany({
        where: {
          programId,
          partnerId: {
            in: partnerIdsToDeactivate,
          },
        },
        data: {
          expiresAt: new Date(),
        },
      }),

      prisma.programEnrollment.updateMany({
        where: {
          partnerId: {
            in: partnerIdsToDeactivate,
          },
          programId,
        },
        data: {
          status: ProgramEnrollmentStatus.deactivated,
          clickRewardId: null,
          leadRewardId: null,
          saleRewardId: null,
          discountId: null,
        },
      }),
    ]);

    waitUntil(
      (async () => {
        const allLinks = programEnrollments.flatMap((pe) => pe.links);
        const allDiscountCodeIds = programEnrollments.flatMap((pe) =>
          pe.discountCodes.map((dc) => dc.id),
        );

        await Promise.allSettled([
          // Expire all links in cache
          linkCache.expireMany(allLinks),

          // Queue discount code deletions
          queueDiscountCodeDeletion(allDiscountCodeIds),

          // Send notification emails
          ...programEnrollments.map(({ program, partner }) =>
            partner.email
              ? sendEmail({
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
                })
              : Promise.resolve(),
          ),

          // Record audit logs
          recordAuditLog(
            programEnrollments.map(({ partner }) => ({
              workspaceId: workspace.id,
              programId,
              action: "partner.deactivated",
              description: `Partner ${partner.id} deactivated`,
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
