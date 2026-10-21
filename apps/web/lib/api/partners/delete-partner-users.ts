import { prisma } from "@/lib/prisma";

// Remove the users of partners that are about to be hard-deleted.
// A raw `DELETE FROM Partner` skips Prisma's emulated cascades, so without this
// the PartnerUser rows and each user's defaultPartnerId keep pointing at the
// deleted partner, and every /api/partner-profile request for them fails.
export async function deletePartnerUsers({
  partnerIds,
}: {
  partnerIds: string[];
}) {
  if (partnerIds.length === 0) {
    return;
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

  if (partnerUsers.length === 0) {
    return;
  }

  const partnerUserIds = partnerUsers.map(({ id }) => id);

  // User has no index on defaultPartnerId, so narrow the update by user ID.
  // With it cleared, getDefaultPartnerId() falls back to another partner.
  await prisma.$transaction([
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
  ]);

  console.log(
    `Deleted ${partnerUserIds.length} partner users for ${partnerIds.length} partners`,
  );
}
