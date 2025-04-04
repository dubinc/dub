import "dotenv-flow/config";
import { workspaceCache } from "@/lib/api/workspace-cache";
import { prisma } from "@dub/prisma";

async function main() {
  const workspaces = await prisma.project.findMany({
    where: {
      allowedHostnames: {
        // @ts-ignore
        not: null,
      },
    },
    select: {
      id: true,
      allowedHostnames: true,
    },
  });

  console.log(`Setting cache for ${workspaces.length} workspaces`);

  await Promise.all(
    workspaces.map((workspace) => {
      workspaceCache.set({
        id: workspace.id,
        data: {
          allowedHostnames: workspace.allowedHostnames as string[],
        },
      });
    }),
  );
}

main();
