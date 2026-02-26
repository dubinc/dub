import { prisma } from "@dub/prisma";
import { queueFolderDeletion } from "./queue-folder-deletion";

export async function deleteWorkspaceFolders({
  workspaceId,
  defaultProgramId, // if defaultProgamId is passed, exclude the default folder of the program from deletion
}: {
  workspaceId: string;
  defaultProgramId?: string | null;
}) {
  let excludedFolderId: string | null = null;
  if (defaultProgramId) {
    const program = await prisma.program.findUniqueOrThrow({
      where: {
        id: defaultProgramId,
      },
      select: {
        defaultFolderId: true,
      },
    });
    excludedFolderId = program.defaultFolderId;
  }
  const folders = await prisma.folder.findMany({
    where: {
      projectId: workspaceId,
      ...(excludedFolderId && {
        id: {
          not: excludedFolderId,
        },
      }),
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
