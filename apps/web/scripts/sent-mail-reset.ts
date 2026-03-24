import { prisma } from "@dub/prisma";
import "dotenv-flow/config";

async function main() {
  while (true) {
    const users = await prisma.user.findMany({
      where: {
        sentMail: true,
      },
      take: 1000,
    });
    if (users.length === 0) {
      console.log("No more users to update");
      break;
    }
    await prisma.user.updateMany({
      where: {
        id: { in: users.map((user) => user.id) },
      },
      data: {
        sentMail: false,
      },
    });
    console.log(`Updated ${users.length} users to sentMail: false`);
  }
}

main();
