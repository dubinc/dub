import { prisma } from "@dub/prisma";
import "dotenv-flow/config";

async function main() {
  const groups = await prisma.programEnrollment.groupBy({
    by: [
      "programId",
      "saleRewardId",
      "leadRewardId",
      "clickRewardId",
      "discountId",
    ],
    _count: {
      _all: true,
    },
    orderBy: {
      _count: {
        programId: "desc",
      },
    },
  });

  console.log(`Found total of ${groups.length} groups`);
  console.table(groups);
}

main();
