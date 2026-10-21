import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";

// Permanently delete partners and every row that cascades from them.
// Prisma's partner.delete() throws for this model, and a raw
// `DELETE FROM Partner` skips the emulated cascades, so this deletes the
// children itself and runs the raw delete in the same transaction.
//
// Callers must remove program data first (enrollments, links, customers,
// commissions and payouts), since those need side effects such as cache,
// Tinybird and search index updates.
export async function hardDeletePartners({
  partnerIds,
}: {
  partnerIds: string[];
}) {
  if (partnerIds.length === 0) {
    return 0;
  }

  const where = {
    partnerId: {
      in: partnerIds,
    },
  };

  const partnerUsers = await prisma.partnerUser.findMany({
    where,
    select: {
      id: true,
      userId: true,
    },
  });

  const results = await prisma.$transaction([
    // Partner users
    prisma.partnerNotificationPreferences.deleteMany({
      where: {
        partnerUserId: {
          in: partnerUsers.map(({ id }) => id),
        },
      },
    }),
    prisma.partnerUser.deleteMany({ where }),
    // User has no index on defaultPartnerId, so narrow the update by user ID.
    // With it cleared, getDefaultPartnerId() falls back to another partner.
    prisma.user.updateMany({
      where: {
        id: {
          in: partnerUsers.map(({ userId }) => userId),
        },
        defaultPartnerId: {
          in: partnerIds,
        },
      },
      data: {
        defaultPartnerId: null,
      },
    }),
    prisma.partnerInvite.deleteMany({ where }),

    // Partner profile
    prisma.partnerIndustryInterest.deleteMany({ where }),
    prisma.partnerPreferredEarningStructure.deleteMany({ where }),
    prisma.partnerSalesChannel.deleteMany({ where }),
    prisma.partnerPlatform.deleteMany({ where }),
    prisma.postback.deleteMany({ where }),

    // Program activity
    prisma.message.deleteMany({ where }),
    prisma.message.deleteMany({
      where: {
        senderPartnerId: {
          in: partnerIds,
        },
      },
    }),
    prisma.partnerComment.deleteMany({ where }),
    prisma.submittedLeadComment.deleteMany({ where }),
    prisma.bountySubmission.deleteMany({ where }),
    prisma.programPartnerTag.deleteMany({ where }),
    prisma.discoveredPartner.deleteMany({ where }),
    prisma.fraudAlert.deleteMany({ where }),
    prisma.fraudEvent.deleteMany({ where }),
    prisma.fraudEventGroup.deleteMany({ where }),

    // Relations that are set to null on delete
    prisma.programApplication.updateMany({
      where,
      data: {
        partnerId: null,
      },
    }),
    prisma.programApplicationEvent.updateMany({
      where: {
        referredByPartnerId: {
          in: partnerIds,
        },
      },
      data: {
        referredByPartnerId: null,
      },
    }),

    prisma.$executeRaw`DELETE FROM Partner WHERE id IN (${Prisma.join(partnerIds)})`,
  ]);

  const deletedPartners = results[results.length - 1] as number;

  console.log(
    `Deleted ${deletedPartners} partners and ${partnerUsers.length} partner users`,
  );

  return deletedPartners;
}
