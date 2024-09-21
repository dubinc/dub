import { DubApiError, exceededLimitError } from "@/lib/api/errors";
import { parseRequestBody } from "@/lib/api/utils";
import { withWorkspace } from "@/lib/auth";
import { determineFolderUserRole } from "@/lib/link-folder/permissions";
import { prisma } from "@/lib/prisma";
import { createFolderSchema, folderSchema } from "@/lib/zod/schemas/folders";
import { FolderAccessLevel } from "@prisma/client";
import { NextResponse } from "next/server";

// GET /api/folders - get all folders for a workspace
export const GET = withWorkspace(
  async ({ workspace, headers, session }) => {
    const folders = await prisma.folder.findMany({
      where: {
        projectId: workspace.id,
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    const folderUsers = await prisma.folderUser.findMany({
      where: {
        folderId: {
          in: folders.map((folder) => folder.id),
        },
        userId: session.user.id,
      },
    });

    // TODO:
    // Add a flag to control if we want to return the role or not

    const folderUsersWithPermissions = folders.map((folder) => {
      const folderUser =
        folderUsers.find((folderUser) => folderUser.folderId === folder.id) ||
        null;

      const role = determineFolderUserRole({
        folder,
        folderUser,
      });

      return {
        ...folderSchema.parse(folder),
        role,
      };
    });

    return NextResponse.json(folderUsersWithPermissions, {
      headers,
    });
  },
  {
    requiredPermissions: ["folders.read"],
  },
);

// POST /api/folders - create a folder for a workspace
export const POST = withWorkspace(
  async ({ req, workspace, headers, session }) => {
    const foldersCount = await prisma.folder.count({
      where: {
        projectId: workspace.id,
      },
    });

    if (foldersCount >= workspace.foldersLimit) {
      throw new DubApiError({
        code: "exceeded_limit",
        message: exceededLimitError({
          plan: workspace.plan,
          limit: workspace.foldersLimit,
          type: "folders",
        }),
      });
    }

    const { name, accessLevel } = createFolderSchema.parse(
      await parseRequestBody(req),
    );

    const existingFolder = await prisma.folder.findFirst({
      where: {
        projectId: workspace.id,
        name,
      },
    });

    if (existingFolder) {
      throw new DubApiError({
        code: "conflict",
        message: `A folder with the name ${name} already exists.`,
      });
    }

    const newFolder = await prisma.folder.create({
      data: {
        projectId: workspace.id,
        name,
        accessLevel: accessLevel as FolderAccessLevel,
        users: {
          create: {
            userId: session.user.id,
            role: "owner",
          },
        },
      },
    });

    return NextResponse.json(folderSchema.parse(newFolder), {
      headers,
      status: 201,
    });
  },
  {
    requiredPermissions: ["folders.write"],
  },
);
