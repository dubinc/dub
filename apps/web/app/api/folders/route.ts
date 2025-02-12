import { DubApiError, exceededLimitError } from "@/lib/api/errors";
import { createId, parseRequestBody } from "@/lib/api/utils";
import { withWorkspace } from "@/lib/auth";
import { getFolders } from "@/lib/folder/get-folders";
import { getPlanCapabilities } from "@/lib/plan-capabilities";
import {
  createFolderSchema,
  FolderSchema,
  listFoldersQuerySchema,
} from "@/lib/zod/schemas/folders";
import { prisma } from "@dub/prisma";
import { NextResponse } from "next/server";

// GET /api/folders - get all folders for a workspace
export const GET = withWorkspace(
  async ({ workspace, headers, session, searchParams }) => {
    const { search } = listFoldersQuerySchema.parse(searchParams);

    const folders = await getFolders({
      workspaceId: workspace.id,
      userId: session.user.id,
      includeLinkCount: true,
      search,
    });

    return NextResponse.json(FolderSchema.array().parse(folders), {
      headers,
    });
  },
  {
    requiredPermissions: ["folders.read"],
    requiredPlan: [
      "pro",
      "business",
      "business plus",
      "business extra",
      "business max",
      "enterprise",
    ],
    featureFlag: "linkFolders",
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

    const { canManageFolderPermissions } = getPlanCapabilities(workspace.plan);

    if (!canManageFolderPermissions && accessLevel !== "write") {
      throw new DubApiError({
        code: "forbidden",
        message:
          "You can only change the access level of a folder on Business and above plans.",
      });
    }

    try {
      const newFolder = await prisma.folder.create({
        data: {
          id: createId({ prefix: "fold_" }),
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

      return NextResponse.json(FolderSchema.parse(newFolder), {
        headers,
        status: 201,
      });
    } catch (error) {
      if (error.code === "P2002") {
        throw new DubApiError({
          code: "conflict",
          message: `A folder with the name ${name} already exists.`,
        });
      }

      throw error;
    }
  },
  {
    requiredPermissions: ["folders.write"],
    requiredPlan: [
      "pro",
      "business",
      "business plus",
      "business extra",
      "business max",
      "enterprise",
    ],
    featureFlag: "linkFolders",
  },
);
