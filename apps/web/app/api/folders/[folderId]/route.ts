import { DubApiError } from "@/lib/api/errors";
import { parseRequestBody } from "@/lib/api/utils";
import { withWorkspace } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { recordLink } from "@/lib/tinybird";
import {
  folderSchema,
  updateFolderBodySchema,
} from "@/lib/zod/schemas/folders";
import { waitUntil } from "@vercel/functions";
import { NextResponse } from "next/server";

// PATCH /api/folders/[folderId] – update a folder for a workspace
export const PATCH = withWorkspace(
  async ({ req, params, workspace, session }) => {
    const { folderId } = params;
    const { name } = updateFolderBodySchema.parse(await parseRequestBody(req));

    const folder = await prisma.folder.findUniqueOrThrow({
      where: {
        id: folderId,
        projectId: workspace.id,
      },
      include: {
        users: true,
      },
    });

    // throwIfNotAllowed({
    //   folder,
    //   userId: session.user.id,
    //   action: "folders.update",
    // });

    try {
      const updatedFolder = await prisma.folder.update({
        where: {
          id: folderId,
          projectId: workspace.id,
        },
        data: {
          name,
        },
      });

      const response = folderSchema.parse(updatedFolder);

      return NextResponse.json(response);
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

    // throwIfNotAllowed({
    //   folder,
    //   userId: session.user.id,
    //   action: "folders.delete",
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
