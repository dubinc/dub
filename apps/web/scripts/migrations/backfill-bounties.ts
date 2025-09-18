import { prisma } from "@dub/prisma";
import "dotenv-flow/config";

async function main() {
  // All existing performance bounties should be all-time stats
  await prisma.bounty.updateMany({
    where: {
      type: "performance",
    },
    data: {
      currentStatsOnly: false,
    },
  });
}

main();
