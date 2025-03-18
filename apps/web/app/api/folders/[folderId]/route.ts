import { DubApiError } from "@/lib/api/errors";
import { queueFolderDeletion } from "@/lib/api/folders/queue-folder-deletion";
import { parseRequestBody } from "@/lib/api/utils";
import { withWorkspace } from "@/lib/auth";
import { verifyFolderAccess } from "@/lib/folder/permissions";
import { getPlanCapabilities } from "@/lib/plan-capabilities";
import { FolderSchema, updateFolderSchema } from "@/lib/zod/schemas/folders";
import { prisma } from "@dub/prisma";
import { waitUntil } from "@vercel/functions";
import { NextResponse } from "next/server";

// GET /api/folders/[folderId] - get information about a folder
export const GET = withWorkspace(
  async ({ params, workspace, session }) => {
    const { folderId } = params;

    const folder = await verifyFolderAccess({
      workspace,
      userId: session.user.id,
      folderId,
      requiredPermission: "folders.read",
    });

    return NextResponse.json(FolderSchema.parse(folder));
  },
  {
    requiredPermissions: ["folders.read"],
    requiredPlan: [
      "pro",
      "business",
      "business plus",
      "business extra",
      "business max",
      "advanced",
      "enterprise",
    ],
    featureFlag: "linkFolders",
  },
);

// PATCH /api/folders/[folderId] – update a folder for a workspace
export const PATCH = withWorkspace(
  async ({ req, params, workspace, session }) => {
    const { folderId } = params;

    const { name, accessLevel } = updateFolderSchema.parse(
      await parseRequestBody(req),
    );

    if (accessLevel) {
      const { canManageFolderPermissions } = getPlanCapabilities(
        workspace.plan,
      );

      // accessLevel is only allowed to be set on Business plans and above otherwise it should be always "write"
      if (!canManageFolderPermissions && accessLevel !== "write") {
        throw new DubApiError({
          code: "forbidden",
          message:
            "You can only set access levels for folders on Business plans and above. Upgrade to Business to continue.",
        });
      }
    }

    await verifyFolderAccess({
      workspace,
      userId: session.user.id,
      folderId,
      requiredPermission: "folders.write",
    });

    try {
      const updatedFolder = await prisma.folder.update({
        where: {
          id: folderId,
          projectId: workspace.id,
        },
        data: {
          name,
          accessLevel,
        },
      });

      return NextResponse.json(FolderSchema.parse(updatedFolder));
    } catch (error) {
      if (error.code === "P2002") {
        throw new DubApiError({
          code: "conflict",
          message: `A folder with the name "${name}" already exists.`,
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
      "advanced",
      "enterprise",
    ],
    featureFlag: "linkFolders",
  },
);

// DELETE /api/folders/[folderId] – delete a folder for a workspace
export const DELETE = withWorkspace(
  async ({ params, workspace, session }) => {
    const { folderId } = params;

    await verifyFolderAccess({
      workspace,
      userId: session.user.id,
      folderId,
      requiredPermission: "folders.write",
    });

    const linksCount = await prisma.link.count({
      where: {
        folderId,
      },
    });

    // if there are no links associated with the folder, we can just delete it
    if (linksCount === 0) {
      await prisma.folder.delete({
        where: {
          id: folderId,
        },
      });
    } else {
      await Promise.all([
        prisma.folder.update({
          where: {
            id: folderId,
          },
          data: {
            projectId: "",
          },
        }),
        queueFolderDeletion({
          folderId,
        }),
      ]);
    }

    waitUntil(
      prisma.project.update({
        where: {
          id: workspace.id,
        },
        data: {
          foldersUsage: {
            decrement: 1,
          },
        },
      }),
    );

    return NextResponse.json({ id: folderId });
  },
  {
    requiredPermissions: ["folders.write"],
    requiredPlan: [
      "pro",
      "business",
      "business plus",
      "business extra",
      "business max",
      "advanced",
      "enterprise",
    ],
    featureFlag: "linkFolders",
  },
);
