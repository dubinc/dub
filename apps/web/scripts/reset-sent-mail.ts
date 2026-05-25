import { prisma } from "@dub/prisma";
import "dotenv-flow/config";

async function main() {
  while (true) {
    const usersToReset = await prisma.user.findMany({
      where: {
        sentMail: true,
      },
    });
    if (usersToReset.length === 0) {
      console.log("No more users to reset");
      break;
    }
    console.log(`Found ${usersToReset.length} users to reset`);
    const res = await prisma.user.updateMany({
      where: {
        id: {
          in: usersToReset.map((user) => user.id),
        },
      },
      data: {
        sentMail: false,
      },
    });
    console.log(`Reset ${res.count} users to sentMail: false`);
  }
}

main();
