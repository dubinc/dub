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

  if (canManageFolderPermissions) {
    const folders = await getFolders({
      workspaceId: workspace.id,
      userId,
    });

    folderIds = folders.map((folder) => folder.id).concat("");
  }

  return folderIds;
};
