import { prisma } from "@dub/prisma";
import { queueFolderDeletion } from "./queue-folder-deletion";

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

  return await Promise.all([
    ...folders.map(({ id }) =>
      queueFolderDeletion({
        folderId: id,
      }),
    ),
    prisma.project.update({
      where: {
        id: workspaceId,
      },
      data: {
        foldersUsage: 0,
      },
    }),
  ]);
}
