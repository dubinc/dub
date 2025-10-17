import { prisma } from "@dub/prisma";
import "dotenv-flow/config";

async function main() {
  const workspaces = await prisma.project.findMany({
    where: {
      plan: {
        not: "free",
      },
      logo: {
        not: null,
      },
    },
    take: 1000,
  });

  if (!workspaces.length) {
    console.log("No workspaces found.");
    return;
  }

  const updated = await Promise.all(
    workspaces.map((workspace) =>
      prisma.domain.updateMany({
        where: {
          projectId: workspace.id,
        },
        data: {
          logo: workspace.logo,
        },
      }),
    ),
  );

  console.log(`Updated ${updated.length} domains.`);
}

main();
