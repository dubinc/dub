import { DubApiError } from "@/lib/api/errors";
import { withWorkspace } from "@/lib/auth";
import { FOLDER_WORKSPACE_ACCESS_TO_USER_ROLE } from "@/lib/link-folder/constants";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

// GET /api/folders/[folderId]/users – get users with access to a folder
export const GET = withWorkspace(
  async ({ params, workspace }) => {
    const { folderId } = params;

    const folder = await prisma.folder.findUniqueOrThrow({
      where: {
        id: folderId,
        projectId: workspace.id,
      },
    });

    const [workspaceUsers, folderUsers] = await Promise.all([
      prisma.projectUsers.findMany({
        where: {
          projectId: workspace.id,
        },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
              image: true,
            },
          },
        },
      }),

      prisma.folderUser.findMany({
        where: {
          folderId,
        },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
              image: true,
            },
          },
        },
      }),
    ]);

    const users = workspaceUsers.map(({ user }) => {
      const folderUser = folderUsers.find(
        (folderUser) => folderUser.userId === user.id,
      );

      const role =
        folderUser?.role ||
        FOLDER_WORKSPACE_ACCESS_TO_USER_ROLE[folder.accessLevel!] ||
        null;

      return {
        id: user.id,
        name: user.name,
        email: user.email,
        image: user.image,
        role,
      };
    });

    return NextResponse.json(users);
  },
  {
    requiredPermissions: ["folders.read"],
  },
);

// DELETE /api/folders/[folderId]/users – delete users from a folder
export const DELETE = withWorkspace(
  async ({ params, workspace, searchParams }) => {
    const { folderId } = params;

    const userIds = searchParams["userIds"]
      ? searchParams["userIds"].split(",")
      : [];

    if (userIds.length === 0) {
      throw new DubApiError({
        code: "bad_request",
        message:
          "Please provide comma separated userIds to delete. For example, `?userIds=x,x,x`",
      });
    }

    await prisma.folder.findUniqueOrThrow({
      where: {
        id: folderId,
        projectId: workspace.id,
      },
    });

    const { count: deletedCount } = await prisma.folderUser.deleteMany({
      where: {
        folderId,
        userId: {
          in: userIds,
        },
      },
    });

    return NextResponse.json({
      deletedCount,
    });
  },
  {
    requiredPermissions: ["folders.write"],
  },
);
