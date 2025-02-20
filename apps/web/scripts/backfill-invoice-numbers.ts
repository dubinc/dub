import { prisma } from "@dub/prisma";
import "dotenv-flow/config";

async function main() {
  const workspaces = await prisma.project.findMany({
    where: {
      programs: {
        some: {},
      },
    },
    select: {
      invoicePrefix: true,
      invoices: {
        select: {
          id: true,
        },
        orderBy: {
          createdAt: "asc",
        },
      },
    },
  });

  const updatedInvoices = await Promise.all(
    workspaces.flatMap(async (workspace) => {
      return workspace.invoices.map(async (invoice, idx) => {
        return prisma.invoice.update({
          where: { id: invoice.id },
          data: { number: `${workspace.invoicePrefix}-000${idx + 1}` },
          select: { id: true, number: true, createdAt: true },
        });
      });
    }),
  );

  console.log(
    "Updated invoice numbers.",
    JSON.stringify(updatedInvoices, null, 2),
  );
}

main();
