import { prisma } from "@dub/prisma";
import "dotenv-flow/config";

async function main() {
  const conditions = {
    operator: "AND",
    amount: 100,
    conditions: [
      {
        entity: "customer",
        attribute: "country",
        operator: "in",
        value: ["US", "IN"],
      },
      {
        entity: "sale",
        attribute: "productId",
        operator: "equals_to",
        value: "basic",
      },
    ],
  };

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
