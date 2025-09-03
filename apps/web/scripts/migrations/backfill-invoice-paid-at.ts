import { prisma } from "@dub/prisma";
import "dotenv-flow/config";

async function main() {
  const invoices = await prisma.invoice.findMany({
    where: {
      paidAt: null,
    },
    orderBy: {
      createdAt: "asc",
    },
    include: {
      payouts: {
        take: 1,
      },
    },
  });

  for (const invoice of invoices) {
    if (invoice.payouts.length > 0 && invoice.payouts[0].paidAt) {
      await prisma.invoice.update({
        where: { id: invoice.id },
        data: { paidAt: invoice.payouts[0].paidAt },
      });
      console.log(
        `Updated invoice ${invoice.id} to ${invoice.payouts[0].paidAt}`,
      );
    }
  }
}

main();
