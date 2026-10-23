import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";

// Delete partners with a raw query, since Prisma's partner.delete() throws for
// this model. A raw delete skips Prisma's emulated cascades, so this also
// removes the partner users in the same transaction. Without that, the
// PartnerUser rows and each user's defaultPartnerId keep pointing at the
// deleted partner, and every /api/partner-profile request for them fails.
export async function deletePartnerAccounts({
  partnerIds,
}: {
  partnerIds: string[];
}) {
  if (partnerIds.length === 0) {
    return 0;
  }

  const partnerUsers = await prisma.partnerUser.findMany({
    where: {
      partnerId: {
        in: partnerIds,
      },
    },
    select: {
      id: true,
      userId: true,
    },
  });

  const partnerUserIds = partnerUsers.map(({ id }) => id);

  const deletePartnerUsers =
    partnerUsers.length > 0
      ? [
          prisma.partnerNotificationPreferences.deleteMany({
            where: {
              partnerUserId: {
                in: partnerUserIds,
              },
            },
          }),

          prisma.partnerUser.deleteMany({
            where: {
              id: {
                in: partnerUserIds,
              },
            },
          }),

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
        ]
      : [];

  const results = await prisma.$transaction([
    ...deletePartnerUsers,
    prisma.$executeRaw`DELETE FROM Partner WHERE id IN (${Prisma.join(partnerIds)})`,
  ]);

  const deletedPartners = results[results.length - 1] as number;

  console.log(
    `Deleted ${deletedPartners} partners and ${partnerUserIds.length} partner users`,
  );

  return deletedPartners;
}
