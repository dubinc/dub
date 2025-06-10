import { prisma } from "@dub/prisma";
import "dotenv-flow/config";

// programEnrollmentId String
// rewardId            String

async function main() {
  const partnerRewards = await prisma.partnerReward.findMany({});

  console.table(partnerRewards);
}

main();
