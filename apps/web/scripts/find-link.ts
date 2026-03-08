import { prisma } from "@dub/prisma";
import "dotenv-flow/config";

async function main() {
  while (true) {
    const users = await prisma.user.findMany({
      where: {
        sentMail: true,
      },
      take: 250,
    });

    if (users.length === 0) {
      console.log("No users found");
      break;
    }

    const res = await prisma.user.updateMany({
      where: {
        id: {
          in: users.map((user) => user.id),
        },
      },
      data: {
        sentMail: false,
      },
    });

    console.log(`Updated ${res.count} users`);
  }
}

main();
