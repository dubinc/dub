import { prisma } from "@dub/prisma";
import "dotenv-flow/config";

async function main() {
  // should support tieredRewardConditionsSchema
  const conditions = [
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
  ];

  await prisma.reward.update({
    where: {
      id: "rw_1K06XABVAY518MGAA70VGPY1W",
    },
    data: {
      modifiers: conditions,
    },
  });
}

main();
