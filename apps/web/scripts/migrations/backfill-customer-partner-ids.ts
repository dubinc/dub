import { prisma } from "@dub/prisma";
import { chunk } from "@dub/utils";
import "dotenv-flow/config";

async function main() {
  while (true) {
    const customers = await prisma.customer.findMany({
      where: {
        programId: null,
        link: {
          programId: {
            not: null,
          },
        },
      },
      select: {
        id: true,
        link: {
          select: {
            programId: true,
            partnerId: true,
          },
        },
      },
      take: 10000,
    });
    if (customers.length === 0) {
      console.log("No customers left to backfill");
      break;
    }

    console.log(`Found ${customers.length} customers to backfill`);

    const chunks = chunk(customers, 100);
    for (let i = 0; i < chunks.length; i++) {
      const chunk = chunks[i];
      console.log(`Backfilling chunk ${i + 1} of ${chunks.length}`);
      await Promise.all(
        chunk.map((customer) =>
          prisma.customer.update({
            where: { id: customer.id },
            data: {
              programId: customer.link?.programId,
              partnerId: customer.link?.partnerId,
            },
          }),
        ),
      );
    }
  }
}

main();
