import { createStagingWorkspaceJob } from "@/lib/jobs/handlers/create-staging-workspace-job";
import { prisma } from "@/lib/prisma";
import { WorkspaceEnvironment } from "@prisma/client";
import "dotenv-flow/config";

const BATCH_SIZE = 10;

// Queue a staging workspace for each production workspace that is eligible but
// does not have one yet. Eligible workspaces have a default program, a plan
// above free/pro, and a slug that does not already end in "-staging".
// Each job creates the staging workspace and its staging program.
async function main() {
  let totalProcessed = 0;
  let totalPublished = 0;
  let totalFailed = 0;
  let cursor: string | undefined;

  while (true) {
    const workspaces = await prisma.project.findMany({
      where: {
        environment: WorkspaceEnvironment.production,
        stagingWorkspaceId: null,
        defaultProgramId: {
          not: null,
        },
        plan: {
          notIn: ["free", "pro"],
        },
        // Skip workspaces where the staging workspace was created manually.
        slug: {
          not: {
            endsWith: "-staging",
          },
        },
        ...(cursor
          ? {
              id: {
                gt: cursor,
              },
            }
          : {}),
      },
      select: {
        id: true,
        slug: true,
        plan: true,
        defaultProgramId: true,
      },
      take: BATCH_SIZE,
      orderBy: {
        id: "asc",
      },
    });

    if (workspaces.length === 0) {
      break;
    }

    cursor = workspaces[workspaces.length - 1].id;

    const { published, deferred, failed } =
      await createStagingWorkspaceJob.dispatchBatch(
        workspaces.map((workspace) => ({
          workspaceId: workspace.id,
        })),
        ({ workspaceId }) => ({
          deduplicationId: `create-staging-workspace-${workspaceId}`,
          label: workspaceId,
        }),
      );

    totalProcessed += workspaces.length;
    totalPublished += published + deferred;
    totalFailed += failed;

    console.log(
      `Dispatched batch of ${workspaces.length} workspaces (processed=${totalProcessed}, published=${totalPublished}, failed=${totalFailed})`,
    );
  }

  console.log(
    `Done queueing staging workspace jobs (processed=${totalProcessed}, published=${totalPublished}, failed=${totalFailed})`,
  );
}

main();
