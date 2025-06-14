import { prisma } from "@dub/prisma";
import "dotenv-flow/config";

async function main() {
  const programEnrollmentsWithNoReward =
    await prisma.programEnrollment.findMany({
      where: {
        clickRewardId: null,
        leadRewardId: null,
        saleRewardId: null,
      },
    });

  console.table(programEnrollmentsWithNoReward);
}

main();
