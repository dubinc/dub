import { Project } from "@prisma/client";
import { getFolders } from "../folder/get-folders";
import { getPlanCapabilities } from "../plan-capabilities";

export const getFolderIdsToFilter = async ({
  workspace,
  userId,
  folderIdToVerify,
}: {
  workspace: Pick<Project, "id" | "plan">;
  userId: string;
  folderIdToVerify?: string;
}) => {
  // If the request is not for a specific folder, find folders the user has access to + unsorted folder
  let folderIds: string[] | undefined = undefined;

  if (!folderIdToVerify) {
    const { canManageFolderPermissions } = getPlanCapabilities(workspace.plan);

    if (canManageFolderPermissions) {
      const folders = await getFolders({
        workspaceId: workspace.id,
        userId,
      });

      folderIds = folders.map((folder) => folder.id).concat("");
    }
  }

  return folderIds;
};
