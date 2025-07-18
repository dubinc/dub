import { prisma } from "@dub/prisma";
import "dotenv-flow/config";

async function main() {
  const partnerUsers = await prisma.user.findMany({
    where: {
      partners: {
        some: {},
      },
      projects: {
        some: {},
      },
    },
    orderBy: {
      createdAt: "asc",
    },
    skip: 200,
  });

  console.log(`Found ${partnerUsers.length} partner users`);

  for (const user of partnerUsers) {
    if (!user.email) {
      console.log(`Skipping ${user.id} because they have no email`);
      continue;
    }

    console.log(
      `Subscribed ${user.email} to partners.dub.co and unsubscribed from app.dub.co`,
    );
  }
}

main();
