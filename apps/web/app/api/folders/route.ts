import { DubApiError, exceededLimitError } from "@/lib/api/errors";
import { parseRequestBody } from "@/lib/api/utils";
import { withWorkspace } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { createFolderSchema, folderSchema } from "@/lib/zod/schemas/folders";
import { FolderAccessLevel } from "@prisma/client";
import { NextResponse } from "next/server";

// GET /api/folders - get all folders for a workspace
export const GET = withWorkspace(
  async ({ workspace, headers }) => {
    const folders = await prisma.folder.findMany({
      where: {
        projectId: workspace.id,
      },
      orderBy: {
        createdAt: "desc",
      },
      select: {
        id: true,
        name: true,
        accessLevel: true,
        createdAt: true,
        updatedAt: true,
        _count: {
          select: {
            links: true,
          },
        },
      },
    });

    const formattedFolders = folders.map((folder) => ({
      ...folder,
      linkCount: folder._count.links,
    }));

    return NextResponse.json(folderSchema.array().parse(formattedFolders), {
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
