import { prisma } from "@dub/prisma";
import "dotenv-flow/config";

async function main() {
  const partnerUsers = await prisma.partnerUser.findMany({
    where: {
      notificationPreferences: null,
    },
    select: {
      id: true,
    },
    take: 100,
  });

  if (partnerUsers.length === 0) {
    console.log("No partner users found without notification preferences");
    return;
  }

  const result = await prisma.partnerNotificationPreferences.createMany({
    data: partnerUsers.map((partnerUser) => ({
      partnerUserId: partnerUser.id,
    })),
  });

  console.log(
    "Created notification preferences for",
    result.count,
    "partner users",
  );
}

main();
