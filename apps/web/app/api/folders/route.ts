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
        accessLevel: true,
        createdAt: true,
        updatedAt: true,
      },
      orderBy: {
        createdAt: "desc",
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

    const { name, accessLevel } = createFolderBodySchema.parse(
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
        accessLevel,
      },
    });

    const response = folderSchema.parse(newFolder);

    return NextResponse.json(response, {
      headers,
      status: 201,
    });
  },
  {
    requiredPermissions: ["folders.write"],
  },
);
