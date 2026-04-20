import { prisma } from "@dub/prisma";
import "dotenv-flow/config";

async function main() {
  // Migrate FraudRule
  const { count } = await prisma.fraudRule.updateMany({
    where: {
      type: "partnerDuplicatePayoutMethod",
    },
    data: {
      type: "partnerDuplicateAccount",
    },
  });

  console.log(
    `Updated ${count} fraud rules from partnerDuplicatePayoutMethod to partnerDuplicateAccount`,
  );

  // Migrate FraudEventGroup
  while (true) {
    const { count } = await prisma.fraudEventGroup.updateMany({
      where: {
        type: "partnerDuplicatePayoutMethod",
      },
      data: {
        type: "partnerDuplicateAccount",
      },
      limit: 100,
    });

    console.log(
      `Updated ${count} fraud event groups from partnerDuplicatePayoutMethod to partnerDuplicateAccount`,
    );

    if (count === 0) {
      break;
    }
  }
}

main();
