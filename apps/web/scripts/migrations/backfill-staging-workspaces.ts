import { prisma } from "@/lib/prisma";
import { createStagingWorkspace } from "@/lib/sandbox/create-staging-workspace";
import { WorkspaceEnvironment } from "@prisma/client";
import "dotenv-flow/config";

const BATCH_SIZE = 50;

async function main() {
  let totalProcessed = 0;
  let totalCreated = 0;
  let totalFailed = 0;

  // TODO:
  // We should skip workspaces where the staging workspace was created manually.
  // SELECT * FROM Project where plan not in ("free", "pro") and slug LIKE '%-staging';

  while (true) {
    const workspaces = await prisma.project.findMany({
      where: {
        environment: WorkspaceEnvironment.production,
        stagingWorkspaceId: null,
        plan: {
          notIn: ["free", "pro"],
        },
        slug: {
          not: {
            endsWith: "-staging",
          },
        },
      },
      select: {
        id: true,
        slug: true,
        plan: true,
      },
      take: BATCH_SIZE,
      orderBy: {
        createdAt: "asc",
      },
    });

    if (workspaces.length === 0) {
      break;
    }

    for (const workspace of workspaces) {
      try {
        await createStagingWorkspace(workspace.id);
        totalCreated++;
        console.log(`Created staging workspace for ${workspace.slug}`);
      } catch (error) {
        totalFailed++;
        console.error(
          `Failed to create staging workspace for ${workspace.slug} (${workspace.id}):`,
          error,
        );
      }

      await new Promise((resolve) => setTimeout(resolve, 1000));
    }

    totalProcessed += workspaces.length;

    console.log(
      `Processed batch of ${workspaces.length} workspaces (processed=${totalProcessed}, created=${totalCreated}, failed=${totalFailed})`,
    );
  }

  console.log(
    `Done creating staging workspaces (processed=${totalProcessed}, created=${totalCreated}, failed=${totalFailed})`,
  );
}

main();
