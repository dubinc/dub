import "dotenv-flow/config";

import { SubmissionRequirements } from "@/lib/types";
import { prisma } from "@dub/prisma";

async function main() {
  const submissionRequirements: SubmissionRequirements = {
    socialMetrics: {
      metric: "likes",
      platform: "instagram",
      minCount: 1000,
      incrementalBonus: {
        incrementalAmount: 1000,
        bonusAmount: 100,
        capAmount: 5000,
      },
    },
  };

  await prisma.bounty.update({
    where: {
      id: "bnty_1KHN6TRMW46QX3PK5EG31RZJA",
    },
    data: {
      submissionRequirements,
    },
  });
}

main();
