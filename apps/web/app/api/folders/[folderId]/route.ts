import { DubApiError } from "@/lib/api/errors";
import { parseRequestBody } from "@/lib/api/utils";
import { withWorkspace } from "@/lib/auth";
import { determineFolderUserRole } from "@/lib/link-folder/permissions";
import { prisma } from "@/lib/prisma";
import { recordLink } from "@/lib/tinybird";
import { folderSchema, updateFolderSchema } from "@/lib/zod/schemas/folders";
import { FolderAccessLevel } from "@prisma/client";
import { waitUntil } from "@vercel/functions";
import { NextResponse } from "next/server";

// GET /api/folders/[folderId] - get information about a folder
export const GET = withWorkspace(
  async ({ params, workspace, session }) => {
    const { folderId } = params;

    const [folder, folderUser] = await Promise.all([
      prisma.folder.findUniqueOrThrow({
        where: {
          id: folderId,
          projectId: workspace.id,
        },
        include: {
          users: true,
        },
      }),

      prisma.folderUser.findUnique({
        where: {
          folderId_userId: {
            folderId,
            userId: session.user.id,
          },
        },
      }),
    ]);

    // TODO:
    // Add a flag to control if we want to return the role or not

    return NextResponse.json({
      ...folderSchema.parse(folder),
      role: determineFolderUserRole({
        folder,
        folderUser,
      }),
    });
  },
  {
    requiredPermissions: ["folders.read"],
  },
);

// PATCH /api/folders/[folderId] – update a folder for a workspace
export const PATCH = withWorkspace(
  async ({ req, params, workspace, session }) => {
    const { folderId } = params;

    const { name, accessLevel } = updateFolderSchema.parse(
      await parseRequestBody(req),
    );

    const folder = await prisma.folder.findUniqueOrThrow({
      where: {
        id: folderId,
        projectId: workspace.id,
      },
      include: {
        users: true,
      },
    });

    // await throwIfNotAllowed({
    //   folder,
    //   userId: session.user.id,
    //   requiredPermission: "folders.write",
    // });

    try {
      const updatedFolder = await prisma.folder.update({
        where: {
          id: folderId,
          projectId: workspace.id,
        },
        data: {
          name,
          accessLevel: accessLevel as FolderAccessLevel,
        },
      });

      return NextResponse.json(folderSchema.parse(updatedFolder));
    } catch (error) {
      if (error.code === "P2002") {
        throw new DubApiError({
          code: "conflict",
          message: `A folder with the name "${name}" already exists.`,
        });
      }

      if (error.code === "P2025") {
        throw new DubApiError({
          code: "not_found",
          message: "Folder not found.",
        });
      }

      throw error;
    }
  },
  {
    requiredPermissions: ["folders.write"],
  },
);

// DELETE /api/folders/[folderId] – delete a folder for a workspace
export const DELETE = withWorkspace(
  async ({ params, workspace, session }) => {
    const { folderId } = params;

    const folder = await prisma.folder.findUniqueOrThrow({
      where: {
        id: folderId,
        projectId: workspace.id,
      },
      include: {
        users: true,
      },
    });

    // await throwIfNotAllowed({
    //   folder,
    //   userId: session.user.id,
    //   requiredPermission: "folders.write",
    // });

    const deletedFolder = await prisma.folder.delete({
      where: {
        id: folderId,
        projectId: workspace.id,
      },
      include: {
        links: {
          select: {
            id: true,
            domain: true,
            key: true,
            url: true,
            createdAt: true,
            tags: {
              select: {
                tagId: true,
              },
            },
          },
        },
      },
    });

    waitUntil(
      (async () => {
        if (deletedFolder.links.length > 0) {
          recordLink(
            deletedFolder.links.map((link) => ({
              link_id: link.id,
              domain: link.domain,
              key: link.key,
              url: link.url,
              tag_ids: link.tags.map((tag) => tag.tagId),
              folder_id: null,
              workspace_id: workspace.id,
              created_at: link.createdAt,
            })),
          );
        }
      })(),
    );

    return NextResponse.json({ id: folderId });
  },
  {
    requiredPermissions: ["folders.write"],
  },
);
