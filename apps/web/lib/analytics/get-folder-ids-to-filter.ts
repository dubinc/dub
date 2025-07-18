import { prisma } from "@dub/prisma";
import { Project } from "@prisma/client";
import { getFolders } from "../folder/get-folders";
import { getPlanCapabilities } from "../plan-capabilities";

export const getFolderIdsToFilter = async ({
  workspace,
  userId,
}: {
  workspace: Pick<Project, "id" | "plan" | "foldersUsage">;
  userId: string;
}) => {
  if (workspace.foldersUsage === 0) {
    return undefined;
  }

  // If the request is not for a specific folder, find folders the user has access to + unsorted folder
  let folderIds: string[] | undefined = undefined;

  const { canManageFolderPermissions } = getPlanCapabilities(workspace.plan);

  // if rbac is enabled, we need to get all folders the user has access to
  if (canManageFolderPermissions) {
    const folders = await getFolders({
      workspaceId: workspace.id,
      userId,
      type: "default",
      pageSize: 1000, // TODO: might need to handle this if folks have > 1000 folders in the future
    });

    folderIds = folders.map((folder) => folder.id).concat("");
    // else, just get all folders for the workspace
  } else {
    const folders = await prisma.folder.findMany({
      where: {
        projectId: workspace.id,
      },
    });

    folderIds = folders.map((folder) => folder.id).concat("");
  }

  return folderIds;
};
