import { withWorkspace } from "@/lib/auth";
import { getFolders } from "@/lib/link-folder/get-folders";
import {
  determineFolderUserRole,
  getFolderPermissions,
} from "@/lib/link-folder/permissions";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

// GET /api/folders/permissions - get folders and their permissions for authenticated user
export const GET = withWorkspace(async ({ workspace, headers, session }) => {
  const folders = await getFolders({
    workspaceId: workspace.id,
    userId: session.user.id,
  });

  const folderUsers = await prisma.folderUser.findMany({
    where: {
      folderId: {
        in: folders.map((folder) => folder.id),
      },
      userId: session.user.id,
    },
  });

  const folderWithPermissions = folders.map((folder) => {
    const folderUser =
      folderUsers.find((folderUser) => folderUser.folderId === folder.id) ||
      null;

    const role = determineFolderUserRole({
      folder,
      folderUser,
    });

    return {
      id: folder.id,
      name: folder.name,
      permissions: getFolderPermissions(role),
    };
  });

  return NextResponse.json(folderWithPermissions, {
    headers,
  });
});
