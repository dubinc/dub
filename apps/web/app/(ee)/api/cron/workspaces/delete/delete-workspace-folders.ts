import { prisma } from "@dub/prisma";
import { logAndRespond } from "../../utils";
import {
  DeleteWorkspacePayload,
  enqueueNextWorkspaceDeleteStep,
} from "./utils";

const MAX_FOLDERS_PER_BATCH = 100;

export async function deleteWorkspaceFoldersBatch(
  payload: DeleteWorkspacePayload,
) {
  const { workspaceId, startingAfter } = payload;

  console.log(`Deleting folders for workspace ${workspaceId}...`);

  const workspace = await prisma.project.findUnique({
    where: {
      id: workspaceId,
    },
    select: {
      id: true,
    },
  });

  if (!workspace) {
    return logAndRespond(`Workspace ${workspaceId} not found. Skipping...`);
  }

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

  if (folders.length === 0) {
    return logAndRespond(
      `No more folders to delete for workspace ${workspaceId}. Skipping...`,
    );
  }

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

  await enqueueNextWorkspaceDeleteStep({
    payload,
    currentStep: "delete-folders",
    nextStep: "delete-customers",
    items: folders,
    maxBatchSize: MAX_FOLDERS_PER_BATCH,
  });
}
