import { withWorkspace } from "@/lib/auth";
import { getFolders } from "@/lib/folder/get-folders";
import {
  findFolderUserRole,
  getFolderPermissions,
} from "@/lib/folder/permissions";
import { prisma } from "@dub/prisma";
import { NextResponse } from "next/server";

// GET /api/folders/permissions - get folders and their permissions for authenticated user
export const GET = withWorkspace(
  async ({ workspace, headers, session }) => {
    const folders = await getFolders({
      workspaceId: workspace.id,
      userId: session.user.id,
      pageSize: 200, // TODO: Handle pagination
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

      const userFolderRole = findFolderUserRole({
        folder,
        user: folderUser,
        workspaceRole: workspace.users[0]?.role,
      });

      return {
        id: folder.id,
        name: folder.name,
        permissions: getFolderPermissions(userFolderRole),
      };
    });

    return NextResponse.json(folderWithPermissions, {
      headers,
    });
  },
  {
    requiredPermissions: ["folders.read"],
    requiredPlan: [
      "business",
      "business plus",
      "business extra",
      "business max",
      "advanced",
      "enterprise",
    ],
  },
);
