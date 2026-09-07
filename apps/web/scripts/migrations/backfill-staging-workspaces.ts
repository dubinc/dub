import { createStagingWorkspaceJob } from "@/lib/jobs/handlers/create-staging-workspace-job";
import { prisma } from "@/lib/prisma";
import { WorkspaceEnvironment } from "@prisma/client";
import "dotenv-flow/config";

const BATCH_SIZE = 10;

async function main() {
  let totalProcessed = 0;
  let totalPublished = 0;
  let totalFailed = 0;
  let cursor: string | undefined;

  // TODO:
  // We should skip workspaces where the staging workspace was created manually.
  // SELECT * FROM Project where plan not in ("free", "pro") and slug LIKE '%-staging';

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
