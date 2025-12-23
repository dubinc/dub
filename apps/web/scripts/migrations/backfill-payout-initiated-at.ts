import { prisma } from "@dub/prisma";
import "dotenv-flow/config";

async function main() {
  const invoices = await prisma.invoice.findMany({
    where: {
      type: "partnerPayout",
      payouts: {
        some: {
          initiatedAt: null,
        },
      },
    },
    take: 10,
  });

  for (const invoice of invoices) {
    const res = await prisma.payout.updateMany({
      where: {
        invoiceId: invoice.id,
      },
      data: {
        initiatedAt: invoice.createdAt,
      },
    });
    console.log(`Updated ${res.count} payouts for invoice ${invoice.id}`);
  }
}

main();
