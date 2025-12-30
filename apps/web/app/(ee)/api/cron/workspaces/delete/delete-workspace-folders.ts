import { prisma } from "@dub/prisma";
import {
  DeleteWorkspacePayload,
  enqueueNextWorkspaceDeleteStep,
} from "./utils";

const MAX_FOLDERS_PER_BATCH = 100;

export async function deleteWorkspaceFolders(payload: DeleteWorkspacePayload) {
  const { workspaceId, startingAfter } = payload;

  const folders = await prisma.folder.findMany({
    where: {
      projectId: workspaceId,
    },
    orderBy: {
      id: "asc",
    },
    ...(startingAfter && {
      skip: 1,
      cursor: {
        id: startingAfter,
      },
    }),
    take: MAX_FOLDERS_PER_BATCH,
  });

  if (folders.length > 0) {
    const deletedFolders = await prisma.folder.deleteMany({
      where: {
        id: {
          in: folders.map(({ id }) => id),
        },
      },
    });

    console.log(
      `Deleted ${deletedFolders.count} folders for workspace ${workspaceId}.`,
    );
  }

  return await enqueueNextWorkspaceDeleteStep({
    payload,
    currentStep: "delete-folders",
    nextStep: "delete-customers",
    items: folders,
    maxBatchSize: MAX_FOLDERS_PER_BATCH,
  });
}
