"server-only";

import { Folder, FolderPermission } from "@/lib/types";
import { prisma } from "@dub/prisma";
import {
  FolderUser,
  FolderUserRole,
  Project,
  WorkspaceRole,
} from "@dub/prisma/client";
import { DubApiError } from "../api/errors";
import { getPlanCapabilities } from "../plan-capabilities";
import {
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
  workspace: Pick<Project, "id" | "plan"> & {
    users: { role: WorkspaceRole }[];
  };
  userId: string;
  folderId: string;
  requiredPermission: FolderPermission;
}) => {
  const folder = await getFolderOrThrow({
    workspaceId: workspace.id,
    folderId,
    userId,
  });

  // Workspace owners have full control over all folders
  if (workspace.users[0]?.role === WorkspaceRole.owner) {
    return folder;
  }

  const { canManageFolderPermissions } = getPlanCapabilities(workspace.plan);

  // If the plan doesn't support folder permissions, we can skip the check
  if (!canManageFolderPermissions) {
    return folder;
  }

  const folderUserRole = findFolderUserRole({
    folder,
    user: folder.user,
    workspaceRole: workspace.users[0]?.role,
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

export const verifyFolderAccessBulk = async ({
  workspace,
  userId,
  folderIds,
  requiredPermission,
}: {
  workspace: Pick<Project, "id" | "plan"> & {
    users: { role: WorkspaceRole }[];
  };
  userId: string;
  folderIds: string[];
  requiredPermission: FolderPermission;
}) => {
  // Workspace owners have full control over all folders
  if (workspace.users[0]?.role === WorkspaceRole.owner) {
    return folderIds.map((folderId) => ({
      folderId,
      hasPermission: true,
    }));
  }

  const folders = await prisma.folder.findMany({
    where: {
      projectId: workspace.id,
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
    const folderUserRole = findFolderUserRole({
      folder,
      user: folder.users[0],
      workspaceRole: workspace.users[0]?.role,
    });

    if (folderUserRole == null) {
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

export const findFolderUserRole = ({
  folder,
  user,
  workspaceRole,
}: {
  folder: Pick<Folder, "accessLevel">;
  user: Pick<FolderUser, "role"> | null;
  workspaceRole: WorkspaceRole;
}) => {
  if (workspaceRole === WorkspaceRole.owner) {
    return FolderUserRole.owner;
  }

  if (user) {
    return user.role;
  }

  if (!folder.accessLevel) {
    return null;
  }

  return FOLDER_WORKSPACE_ACCESS_TO_FOLDER_USER_ROLE[folder.accessLevel];
};

// Get the permissions for a folder for a given user role
export const getFolderPermissions = (role: string | null) => {
  if (!role) {
    return [];
  }

  return FOLDER_USER_ROLE_TO_PERMISSIONS[role] || [];
};
