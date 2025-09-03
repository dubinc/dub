import { prisma } from "@dub/prisma";
import { generateRandomString } from "@dub/utils";
import "dotenv-flow/config";

async function main() {
  const workspaces = await prisma.project.findMany({
    where: {
      invoicePrefix: null,
    },
    select: {
      id: true,
    },
    take: 100,
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
        select: { slug: true, invoicePrefix: true },
      }),
    ),
  );

  const remaining = await prisma.project.count({
    where: {
      invoicePrefix: null,
    },
  });
  console.log(
    `Updated invoice prefixes for ${updatedWorkspaces.length} workspaces. ${remaining} workspaces left to update.`,
  );
}

main();
