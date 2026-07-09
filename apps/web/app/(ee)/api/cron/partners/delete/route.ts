import { recordAuditLog } from "@/lib/api/audit-logs/record-audit-log";
import { bulkDeleteLinks } from "@/lib/api/links/bulk-delete-links";
import { includeTags } from "@/lib/api/links/include-tags";
import { withCron } from "@/lib/cron/with-cron";
import { deleteDiscountCodes } from "@/lib/discounts/delete-discount-code";
import { aggregatePartnerLinksStats } from "@/lib/partners/aggregate-partner-links-stats";
import { canDeletePartner } from "@/lib/partners/utils";
import { prisma } from "@/lib/prisma";
import * as z from "zod/v4";
import { logAndRespond } from "../../utils";

const inputSchema = z.object({
  workspaceId: z.string(),
  programId: z.string(),
  partnerId: z.string(),
  userId: z.string(),
});

// POST /api/cron/partners/delete - handle all side effects of permanently deleting a partner
export const POST = withCron(async ({ rawBody }) => {
  const { programId, partnerId, workspaceId, userId } = inputSchema.parse(
    JSON.parse(rawBody),
  );

  console.info(
    `Permanently deleting partner ${partnerId} from program ${programId}...`,
  );

  const programEnrollment = await prisma.programEnrollment.findUnique({
    where: {
      partnerId_programId: {
        partnerId,
        programId,
      },
    },
    include: {
      partner: true,
      links: {
        include: includeTags,
      },
      programPartnerTags: {
        include: {
          partnerTag: true,
        },
      },
      discountCodes: {
        include: {
          discount: {
            select: {
              provider: true,
            },
          },
        },
      },
    },
  });

  if (!programEnrollment) {
    return logAndRespond(
      `Partner ${partnerId} is not enrolled in program ${programId}. Skipping delete.`,
    );
  }

  const linkStats = aggregatePartnerLinksStats(programEnrollment.links);

  const canDelete = canDeletePartner({
    ...programEnrollment,
    ...linkStats,
  });

  if (!canDelete) {
    return logAndRespond(
      `Partner ${partnerId} can no longer be permanently deleted.`,
    );
  }

  const programEnrollmentWhere = {
    programId,
    partnerId,
  };

  // Additional check
  const [commissionCount, payoutCount] = await Promise.all([
    prisma.commission.count({
      where: programEnrollmentWhere,
    }),

    prisma.payout.count({
      where: programEnrollmentWhere,
    }),
  ]);

  if (commissionCount > 0 || payoutCount > 0) {
    return logAndRespond(
      `Partner ${partnerId} cannot be permanently deleted because it has associated commissions or payouts.`,
    );
  }

  const { partner, links, programPartnerTags, discountCodes, ...enrollment } =
    programEnrollment;

  // Clear rows that FK to Customer before detaching customers
  const [
    submittedLeads,
    fraudEvents,
    fraudEventGroups,
    messages,
    discoveredPartners,
  ] = await Promise.all([
    prisma.submittedLead.deleteMany({
      where: programEnrollmentWhere,
    }),

    prisma.fraudEvent.deleteMany({
      where: programEnrollmentWhere,
    }),

    prisma.fraudEventGroup.deleteMany({
      where: programEnrollmentWhere,
    }),

    prisma.message.deleteMany({
      where: programEnrollmentWhere,
    }),

    prisma.discoveredPartner.deleteMany({
      where: programEnrollmentWhere,
    }),

    deleteDiscountCodes(discountCodes),
  ]);

  console.log(`Delete ${submittedLeads.count} submitted leads.`);
  console.log(`Delete ${fraudEvents.count} fraud events.`);
  console.log(`Delete ${fraudEventGroups.count} fraud event groups.`);
  console.log(`Delete ${messages.count} messages.`);
  console.log(
    `Delete ${discoveredPartners.count} discovered partners records.`,
  );
  console.log(`Delete ${discountCodes.length} discount codes.`);

  if (links.length > 0) {
    await bulkDeleteLinks(
      links.map((link) => ({
        ...link,
        programEnrollment: {
          groupId: enrollment.groupId,
          programPartnerTags,
        },
      })),
    );

    const deletedLinks = await prisma.link.deleteMany({
      where: {
        id: {
          in: links.map((link) => link.id),
        },
      },
    });

    console.log(`Delete ${deletedLinks.count} links.`);
  }

  await prisma.$transaction([
    prisma.programEnrollment.delete({
      where: {
        id: enrollment.id,
      },
    }),

    prisma.project.update({
      where: {
        id: workspaceId,
      },
      data: {
        partnersUsage: {
          decrement: 1,
        },
      },
    }),
  ]);

  await recordAuditLog({
    workspaceId,
    programId,
    action: "partner.deleted",
    description: `Partner ${partner.id} permanently deleted`,
    actor: {
      id: userId,
    },
    targets: [
      {
        type: "partner",
        id: partner.id,
        metadata: partner,
      },
    ],
  });

  return logAndRespond(
    `Partner ${partnerId} permanently deleted from program ${programId}.`,
  );
});
