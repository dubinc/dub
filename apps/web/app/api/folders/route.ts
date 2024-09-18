import { DubApiError, exceededLimitError } from "@/lib/api/errors";
import { parseRequestBody } from "@/lib/api/utils";
import { withWorkspace } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  createFolderBodySchema,
  folderSchema,
} from "@/lib/zod/schemas/folders";
import { NextResponse } from "next/server";

// GET /api/folders - get all folders for a workspace
export const GET = withWorkspace(
  async ({ workspace, headers }) => {
    const folders = await prisma.folder.findMany({
      where: {
        projectId: workspace.id,
      },
      select: {
        id: true,
        name: true,
        createdAt: true,
        updatedAt: true,
      },
      orderBy: {
        name: "asc",
      },
    });

    const response = folderSchema.array().parse(folders);

    return NextResponse.json(response, {
      headers,
    });
  },
  {
    requiredPermissions: ["folders.read"],
  },
);

// POST /api/folders - create a folder for a workspace
export const POST = withWorkspace(
  async ({ req, workspace, headers }) => {
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

    const { name, users } = createFolderBodySchema.parse(
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

    // Check the given users has access to the workspace
    let usersWithAccess: { userId: string; accessLevel: string | null }[] = [];

    if (users) {
      const workspaceUsers = await prisma.projectUsers.findMany({
        where: {
          projectId: workspace.id,
          AND: {
            userId: {
              in: users?.map((user) => user.userId) || [],
            },
          },
        },
        select: {
          id: true,
          userId: true,
        },
      });

      usersWithAccess = workspaceUsers?.map(({ userId }) => {
        const userAccess = users?.find((u) => u.userId === userId);

        return {
          userId,
          accessLevel: userAccess?.accessLevel || null,
        };
      });
    }

    const folder = await prisma.folder.create({
      data: {
        projectId: workspace.id,
        name,
        ...(usersWithAccess.length > 0 && {
          users: {
            create: usersWithAccess,
          },
        }),
      },
    });

    const response = folderSchema.parse(folder);

    return NextResponse.json(response, {
      headers,
      status: 201,
    });
  },
  {
    requiredPermissions: ["folders.write"],
  },
);
