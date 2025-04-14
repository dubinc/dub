import { prisma } from "@dub/prisma";
import { generateRandomString } from "@dub/utils";
import "dotenv-flow/config";

async function main() {
  const workspaces = await prisma.project.findMany({
    where: {
      partnersEnabled: true,
    },
    select: {
      id: true,
      slug: true,
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
      // no need to update workspaces that already have an invoice prefix
      if (workspace.invoicePrefix) {
        return [];
      }

      const newWorkspace = await prisma.project.update({
        where: { id: workspace.id },
        data: { invoicePrefix: generateRandomString(8) },
      });

      console.log(
        `Updated workspace ${workspace.slug} to have invoice prefix ${newWorkspace.invoicePrefix}`,
      );

      return workspace.invoices.map(async (invoice, idx) => {
        return prisma.invoice.update({
          where: { id: invoice.id },
          data: { number: `${newWorkspace.invoicePrefix}-000${idx + 1}` },
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
