import { prisma } from "@/lib/prisma";
import "dotenv-flow/config";

// Finds partner users and default partner IDs that point to a partner that no longer exists,
// then deletes the partner users (with their notification preferences) and clears the default partner IDs.
// Partner deletes used raw SQL, which skips Prisma's emulated cascades (relationMode = "prisma").
// deletePartnerAccounts now cleans up both on every delete, so this only fixes the rows left before that.
//
// Usage: pnpm script partners/find-orphaned-partner-users
// Set DRY_RUN to false to delete the partner users and clear the default partner IDs.

const DRY_RUN = true;

type OrphanedPartnerUser = {
  id: string;
  userId: string;
  partnerId: string;
};

type UserWithMissingDefaultPartner = {
  id: string;
  defaultPartnerId: string;
};

async function main() {
  const orphanedPartnerUsers = await prisma.$queryRaw<OrphanedPartnerUser[]>`
    SELECT pu.id, pu.userId, pu.partnerId
    FROM PartnerUser pu
    LEFT JOIN Partner p ON p.id = pu.partnerId
    WHERE p.id IS NULL
  `;

  // User has no index on defaultPartnerId, so this scans the User table once
  const usersWithMissingDefaultPartner = await prisma.$queryRaw<
    UserWithMissingDefaultPartner[]
  >`
    SELECT u.id, u.defaultPartnerId
    FROM User u
    LEFT JOIN Partner p ON p.id = u.defaultPartnerId
    WHERE u.defaultPartnerId IS NOT NULL AND p.id IS NULL
  `;

  console.log(
    `Found ${orphanedPartnerUsers.length} partner users and ${usersWithMissingDefaultPartner.length} users with a default partner that does not exist.`,
  );

  if (
    orphanedPartnerUsers.length === 0 &&
    usersWithMissingDefaultPartner.length === 0
  ) {
    return;
  }

  console.table(orphanedPartnerUsers);

  if (DRY_RUN) {
    console.log("DRY_RUN is enabled, skipping the cleanup.");
    return;
  }

  // one partner user at a time, by primary key
  for (const { id } of orphanedPartnerUsers) {
    await prisma.$transaction([
      prisma.partnerNotificationPreferences.deleteMany({
        where: {
          partnerUserId: id,
        },
      }),
      prisma.partnerUser.delete({
        where: {
          id,
        },
      }),
    ]);
  }
  console.log(`Deleted ${orphanedPartnerUsers.length} partner users`);

  // one user at a time, by primary key. With the default cleared,
  // getDefaultPartnerId() falls back to another partner of the user.
  for (const { id, defaultPartnerId } of usersWithMissingDefaultPartner) {
    await prisma.user.updateMany({
      where: {
        id,
        defaultPartnerId,
      },
      data: {
        defaultPartnerId: null,
      },
    });
  }
  console.log(
    `Cleared the default partner ID of ${usersWithMissingDefaultPartner.length} users`,
  );
}

main();
