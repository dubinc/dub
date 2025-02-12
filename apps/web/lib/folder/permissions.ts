"server-only";

import { Folder, FolderPermission } from "@/lib/types";
import { prisma } from "@dub/prisma";
import { FolderUser, Project } from "@dub/prisma/client";
import { DubApiError } from "../api/errors";
import { getPlanCapabilities } from "../plan-capabilities";
import {
  FOLDER_USER_ROLE,
  FOLDER_USER_ROLE_TO_PERMISSIONS,
  FOLDER_WORKSPACE_ACCESS_TO_FOLDER_USER_ROLE,
} from "./constants";
import { getFolderOrThrow } from "./get-folder-or-throw";

export const verifyFolderAccess = async ({
  workspace,
  userId,
  folderId,
  requiredPermission,
}: {
  workspace: Pick<Project, "id" | "plan">;
  userId: string;
  folderId: string;
  requiredPermission: FolderPermission;
}) => {
  const folder = await getFolderOrThrow({
    workspaceId: workspace.id,
    folderId,
    userId,
  });

  const { canManageFolderPermissions } = getPlanCapabilities(workspace.plan);

  // If the plan doesn't support folder permissions, we can skip the check
  if (!canManageFolderPermissions) {
    return folder;
  }

  const folderUserRole = findUserFolderRole({
    folder,
    user: folder.user,
  });

  if (!folderUserRole) {
    throw new DubApiError({
      code: "forbidden",
      message: "You are not allowed to perform this action on this folder.",
    });
  }

  const permissions = getFolderPermissions(folderUserRole);

  if (!permissions.includes(requiredPermission)) {
    throw new DubApiError({
      code: "forbidden",
      message: "You are not allowed to perform this action on this folder.",
    });
  }

  return folder;
};

// Get the permissions for a folder for a given user role
export const getFolderPermissions = (
  role: keyof typeof FOLDER_USER_ROLE | null,
) => {
  if (!role) {
    return [];
  }

  return FOLDER_USER_ROLE_TO_PERMISSIONS[role] || [];
};

export const findUserFolderRole = ({
  folder,
  user,
}: {
  folder: Pick<Folder, "accessLevel">;
  user: Pick<FolderUser, "role"> | null;
}) => {
  if (user) {
    return user.role;
  }

  if (!folder.accessLevel) {
    return null;
  }

  return FOLDER_WORKSPACE_ACCESS_TO_FOLDER_USER_ROLE[folder.accessLevel];
};

export const checkFolderPermissions = async ({
  workspaceId,
  userId,
  folderIds,
  requiredPermission,
}: {
  workspaceId: string;
  userId: string;
  folderIds: string[];
  requiredPermission: FolderPermission;
}) => {
  const folders = await prisma.folder.findMany({
    where: {
      projectId: workspaceId,
      id: {
        in: folderIds,
      },
    },
    include: {
      users: {
        where: {
          userId,
        },
        take: 1,
      },
    },
  });

  return folders.map((folder) => {
    const folderUserRole = findUserFolderRole({
      folder,
      user: folder.users[0],
    });

    if (!folderUserRole) {
      return {
        folderId: folder.id,
        hasPermission: false,
      };
    }

    const permissions = getFolderPermissions(folderUserRole);

    return {
      folderId: folder.id,
      hasPermission: permissions.includes(requiredPermission),
    };
  });
};
