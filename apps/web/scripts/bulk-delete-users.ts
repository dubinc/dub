import { prisma } from "@/lib/prisma";
import "dotenv-flow/config";

const USER_IDS = [];

async function main() {
  let deleted = 0;
  let failed = 0;

  // const projectUsers = await prisma.projectUsers.findMany({
  //   where: {
  //     userId: {
  //       in: USER_IDS,
  //     },
  //   },
  // });

  // console.log(`Found ${projectUsers.length} project users.`);
  // console.log(projectUsers);

  for (const userId of USER_IDS) {
    try {
      const user = await prisma.user.delete({
        where: { id: userId },
        select: { id: true, email: true },
      });
      console.log(`Deleted user ${user.email} (${user.id})`);
      deleted++;
    } catch (error) {
      console.error(`Failed to delete user ${userId}:`, error);
      failed++;
    }
  }

  console.log(`Done. Deleted ${deleted} users, ${failed} failed.`);
}

main();
