import { prisma } from "@dub/prisma";
import "dotenv-flow/config";

async function main() {
  // should support tieredRewardConditionsSchema
  const conditions = [
    {
      operator: "AND",
      amount: 100,
      conditions: [
        {
          entity: "customer",
          attribute: "country",
          operator: "equals_to",
          value: "IN",
        },
      ],
    },
    {
      operator: "AND",
      amount: 200,
      conditions: [
        {
          entity: "customer",
          attribute: "country",
          operator: "equals_to",
          value: "US",
        },
        {
          entity: "sale",
          attribute: "productId",
          operator: "equals_to",
          value: "basic",
        },
      ],
    },
  ];

  await prisma.reward.update({
    where: {
      id: "rw_1K0E4ND6323QZGBVA4HVHEPW9",
    },
    data: {
      modifiers: conditions,
    },
  });
}

main();
