import { DubApiError, exceededLimitError } from "@/lib/api/errors";
import { parseRequestBody } from "@/lib/api/utils";
import { withWorkspace } from "@/lib/auth";
import { getFolders } from "@/lib/folder/get-folders";
import { prisma } from "@/lib/prisma";
import {
  createFolderSchema,
  folderSchema,
  listFoldersQuerySchema,
} from "@/lib/zod/schemas/folders";
import { getSearchParams } from "@dub/utils";
import { NextResponse } from "next/server";

// GET /api/folders - get all folders for a workspace
export const GET = withWorkspace(
  async ({ workspace, headers, session, req }) => {
    const searchParams = getSearchParams(req.url);
    const { search } = listFoldersQuerySchema.parse(searchParams);

    const folders = await getFolders({
      workspaceId: workspace.id,
      userId: session.user.id,
      includeLinkCount: true,
      search,
    });

    return NextResponse.json(folderSchema.array().parse(folders), {
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
        accessLevel,
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
