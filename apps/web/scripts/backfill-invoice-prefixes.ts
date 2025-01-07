import { generateInvoicePrefix } from "@/lib/api/invoices/utils";
import { prisma } from "@dub/prisma";
import "dotenv-flow/config";

async function main() {
  const workspaces = await prisma.project.findMany({
    where: {
      invoicePrefix: null,
      payoutMethodId: {
        not: null,
      },
    },
    select: {
      id: true,
    },
  });

  if (workspaces.length === 0) {
    console.log("No workspaces left to update.");
    return;
  }

  const invoicePrefixes = await Promise.all(
    workspaces.map(async () => generateInvoicePrefix()),
  );

  const updatedWorkspaces = await Promise.all(
    workspaces.map(async (workspace, index) =>
      prisma.project.update({
        where: { id: workspace.id },
        data: { invoicePrefix: invoicePrefixes[index] },
        select: { id: true, invoicePrefix: true },
      }),
    ),
  );

  console.log("Updated invoice prefixes for workspaces.", updatedWorkspaces);
}

main();
