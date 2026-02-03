import { Session } from "@/lib/auth";
import { sendBatchEmail } from "@dub/email";
import PartnerDeactivated from "@dub/email/templates/partner-deactivated";
import { prisma } from "@dub/prisma";
import { waitUntil } from "@vercel/functions";
import { recordAuditLog } from "../audit-logs/record-audit-log";
import { queueDiscountCodeDeletion } from "../discounts/queue-discount-code-deletion";
import { linkCache } from "../links/cache";

interface BulkDeactivatePartnersParams {
  programId: string;
  partnerIds: string[];
  user?: Session["user"];
}

export async function bulkDeactivatePartners({
  programId,
  partnerIds,
  user,
}: BulkDeactivatePartnersParams) {
  const programEnrollments = await prisma.programEnrollment.findMany({
    where: {
      partnerId: {
        in: partnerIds,
      },
      programId,
      status: {
        in: ["approved", "archived"],
      },
    },
    include: {
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
        },
      },
      discountCodes: true,
    },
  });

  if (programEnrollments.length === 0) {
    console.log(
      "[bulkDeactivatePartners] No program enrollments found to deactivate.",
    );
    return;
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
        status: {
          in: ["approved", "archived"],
        },
      },
      data: {
        status: "deactivated",
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

      const program = await prisma.program.findUniqueOrThrow({
        where: {
          id: programId,
        },
        select: {
          workspaceId: true,
          name: true,
          supportEmail: true,
          slug: true,
        },
      });

      await Promise.allSettled([
        // Expire all links in cache
        linkCache.expireMany(allLinks),

        // Queue discount code deletions
        queueDiscountCodeDeletion(allDiscountCodeIds),

        // Send notification emails
        sendBatchEmail(
          programEnrollments.map(({ partner }) => ({
            variant: "notifications",
            subject: `Your partnership with ${program.name} has been deactivated`,
            to: partner.email!,
            replyTo: program.supportEmail || "noreply",
            react: PartnerDeactivated({
              partner: {
                name: partner.name,
                email: partner.email!,
              },
              program: {
                name: program.name,
                slug: program.slug,
              },
            }),
          })),
        ),

        // Record audit logs
        user &&
          recordAuditLog(
            programEnrollments.map(({ partner }) => ({
              workspaceId: program.workspaceId,
              programId,
              action: "partner.deactivated",
              description: `Partner ${partner.id} deactivated`,
              actor: user,
              targets: [
                {
                  type: "partner",
                  id: partner.id,
                  metadata: {
                    name: partner.name,
                    email: partner.email ?? null,
                  },
                },
              ],
            })),
          ),
      ]);
    })(),
  );
}
