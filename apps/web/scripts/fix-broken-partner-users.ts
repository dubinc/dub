import { prisma } from "@dub/prisma";
import "dotenv-flow/config";

async function main() {
  let batch = 0;
  while (true) {
    const partnerUserIds = await prisma.partnerUser.findMany({
      select: {
        userId: true,
      },
      take: 50000,
      skip: batch * 50000,
    });
    if (partnerUserIds.length === 0) {
      break;
    }
    const users = await prisma.user.findMany({
      where: {
        id: {
          in: partnerUserIds.map((partnerUser) => partnerUser.userId),
        },
      },
    });
    const usersThatDontExist = partnerUserIds.filter(
      (partnerUser) => !users.some((user) => user.id === partnerUser.userId),
    );
    console.log(usersThatDontExist);

    const deletedPartnerUsers = await prisma.partnerUser.deleteMany({
      where: {
        userId: {
          in: usersThatDontExist.map((partnerUser) => partnerUser.userId),
        },
      },
    });
    console.log(`Deleted ${deletedPartnerUsers.count} partner users`);
    batch++;
  }
}

main();
