import { prisma } from "@dub/prisma";
import "dotenv-flow/config";

async function main() {
  const users = await prisma.user.findMany({
    where: {
      notificationPreferences: null,
    },
    select: {
      id: true,
    },
    take: 1000,
  });

  const res = await prisma.userNotificationPreferences.createMany({
    data: users.map((user) => ({
      userId: user.id,
    })),
  });

  console.log(`Created ${res.count} notification preferences`);
}

main();
