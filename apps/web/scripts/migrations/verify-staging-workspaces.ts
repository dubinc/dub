import { prisma } from "@/lib/prisma";
import { WorkspaceEnvironment } from "@prisma/client";
import "dotenv-flow/config";

// Verify eligible production workspaces that are missing a staging workspace or a staging program.
async function main() {
  const workspaces = await prisma.project.findMany({
    where: {
      environment: WorkspaceEnvironment.production,
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
    },
    select: {
      id: true,
      slug: true,
      stagingWorkspaceId: true,
    },
    orderBy: {
      id: "asc",
    },
  });

  const missingStagingWorkspace = workspaces
    .filter((workspace) => !workspace.stagingWorkspaceId)
    .map(({ id, slug }) => ({ id, slug }));

  const stagingWorkspacesWithoutProgram = await prisma.project.findMany({
    where: {
      id: {
        in: workspaces.flatMap((workspace) =>
          workspace.stagingWorkspaceId ? [workspace.stagingWorkspaceId] : [],
        ),
      },
      defaultProgramId: null,
    },
    select: {
      id: true,
    },
  });

  const stagingIdsWithoutProgram = new Set(
    stagingWorkspacesWithoutProgram.map((workspace) => workspace.id),
  );

  const missingStagingProgram = workspaces
    .filter(
      (workspace) =>
        workspace.stagingWorkspaceId &&
        stagingIdsWithoutProgram.has(workspace.stagingWorkspaceId),
    )
    .map(({ id, slug }) => ({ id, slug }));

  console.log(
    `${missingStagingWorkspace.length} workspaces are missing a staging workspace.`,
  );

  console.table(missingStagingWorkspace);

  console.log(
    `${missingStagingProgram.length} workspaces are missing a staging program.`,
  );

  console.table(missingStagingProgram);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
