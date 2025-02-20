import { prisma } from "@dub/prisma";
import { generateRandomString } from "@dub/utils";
import "dotenv-flow/config";

async function main() {
  const workspaces = await prisma.project.findMany({
    where: {
      invoicePrefix: null,
      programs: {
        some: {},
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

  const updatedWorkspaces = await Promise.all(
    workspaces.map(async (workspace) =>
      prisma.project.update({
        where: { id: workspace.id },
        data: { invoicePrefix: generateRandomString(8) },
        select: { id: true, invoicePrefix: true },
      }),
    ),
  );

  console.log("Updated invoice prefixes for workspaces.", updatedWorkspaces);
}

main();
