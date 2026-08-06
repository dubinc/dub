import { prisma } from "@/lib/prisma";
import "dotenv-flow/config";

const USER_IDS = [
  "user_1KWJA9VBJAWHRYTBMNXKBSEV6",
  "user_1KWGF6ASW9ARS3PRWC7VQWCJP",
  "user_1KWGF56D4RKHJ4J3T74T1GJBB",
  "user_1KWG3B6WXB20Z820ZQ740CVN9",
  "user_1KWG3DDGFQRQ6315YH263Q01H",
  "user_1KWFQ65M4NCE4TBA7DHHPV9FA",
  "user_1KWAYN607SX8ZY0EHAEHZH8CZ",
  "user_1KWAYK2WQ08H44Z89AV5D0142",
  "user_1KWAYHZCAJJAF3BASR9M8J73B",
  "user_1KWAYGG4HQ1YCRCTDXD43961W",
  "user_1KWAYF2EXQ32FCQ245FQWJ3KE",
  "user_1KWAYE11PN191CW7W2GCA7WGW",
  "user_1KWAYBXHGAK891JC0EZEK4K6V",
  "user_1KTSRRXPTB7NRECH0QAQX8DMK",
  "user_1KTSEGRBAC8Z3PZJMRQ7BQEF8",
  "user_1KTS2VTNNHMBWTSXPQ1SH1SZ8",
];

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
