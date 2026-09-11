import "dotenv-flow/config";

import { prisma } from "@/lib/prisma";

const BATCH_SIZE = 100;

async function main() {
  let totalProcessed = 0;

  while (true) {
    const discounts = await prisma.discount.findMany({
      where: {
        groupId: null,
      },
      select: {
        id: true,
        partnerGroup: {
          select: {
            id: true,
          },
        },
      },
      take: BATCH_SIZE,
      orderBy: {
        createdAt: "asc",
      },
    });

    if (discounts.length === 0) {
      break;
    }

    await Promise.all(
      discounts.map((discount) => {
        const groupId = discount.partnerGroup?.id;

        if (!groupId) {
          console.log(`No group found for discount ${discount.id}`);
          return;
        }

        return prisma.discount.update({
          where: {
            id: discount.id,
          },
          data: {
            groupId,
          },
        });
      }),
    );

    totalProcessed += discounts.length;

    console.log(
      `Backfilled ${discounts.length} discount groupIds (processed=${totalProcessed})`,
    );
  }

  console.log(
    `Done backfilling discount groupIds (processed=${totalProcessed})`,
  );
}

main();
