import { folderDeletedJob } from "@/lib/jobs/handlers/folder-deleted-job";
import { prisma } from "@/lib/prisma";

export async function deleteWorkspaceFolders({
  workspaceId,
}: {
  workspaceId: string;
}) {
  const folders = await prisma.folder.findMany({
    where: {
      projectId: workspaceId,
    },
    select: {
      id: true,
    },
  });

  if (folders.length === 0) {
    console.log(`No folders found to delete for workspace ${workspaceId}`);
    return;
  }

  const folderIds = folders.map(({ id }) => id);

  await prisma.$transaction([
    prisma.projectUsers.updateMany({
      where: {
        projectId: workspaceId,
        defaultFolderId: {
          in: folderIds,
        },
      },
      data: {
        defaultFolderId: null,
      },
    }),

    prisma.folder.updateMany({
      where: {
        id: {
          in: folderIds,
        },
      },
      data: {
        projectId: "",
      },
    }),

    prisma.project.update({
      where: {
        id: workspaceId,
      },
      data: {
        foldersUsage: 0,
      },
    }),
  ]);

  await folderDeletedJob.dispatchBatch(
    folderIds.map((folderId) => ({ folderId })),
    ({ folderId }) => ({
      label: folderId,
    }),
  );
}
