// @ts-ignore
import "dotenv-flow/config";

import { prisma } from "@/lib/prisma";

const DRY_RUN = true;

async function main() {
  const orphans = await prisma.$queryRaw<
    { id: string; userId: string; partnerId: string; role: string }[]
  >`
    SELECT pu.id, pu.userId, pu.partnerId, pu.role
    FROM PartnerUser pu
    LEFT JOIN User u ON u.id = pu.userId
    WHERE u.id IS NULL
  `;

  console.log(`Found ${orphans.length} orphaned PartnerUser row(s).`);
  console.table(orphans);

  if (orphans.length === 0) {
    return;
  }

  // Double-confirm: none of these userIds should exist in User
  const users = await prisma.user.findMany({
    where: {
      id: {
        in: orphans.map((o) => o.userId),
      },
    },
    select: {
      id: true,
      email: true,
    },
  });

  console.log(`Users found for orphan userIds: ${users.length}`);
  console.table(users);

  if (users.length > 0) {
    console.error("Aborting: some userIds still exist. Query is wrong.");
    return;
  }

  if (DRY_RUN) {
    return;
  }

  const ids = orphans.map((o) => o.id);

  await prisma.partnerNotificationPreferences.deleteMany({
    where: {
      partnerUserId: {
        in: ids,
      },
    },
  });

  const deleted = await prisma.partnerUser.deleteMany({
    where: {
      id: {
        in: ids,
      },
    },
  });

  console.log(`Deleted ${deleted.count} PartnerUser row(s).`);
}

main();
