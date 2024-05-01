import { DubApiError } from "@/lib/api/errors";
import { withWorkspace } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { recordLink } from "@/lib/tinybird";
import { updateTagBodySchema } from "@/lib/zod/schemas";
import { NextResponse } from "next/server";

// PATCH /api/workspaces/[idOrSlug]/tags/[id] – update a tag for a workspace
export const PATCH = withWorkspace(async ({ req, params, workspace }) => {
  const { id } = params;
  const { name, color } = updateTagBodySchema.parse(await req.json());

  const tag = await prisma.tag.findFirst({
    where: {
      id,
      projectId: workspace.id,
    },
  });

  if (!tag) {
    throw new DubApiError({
      code: "not_found",
      message: "Tag not found.",
    });
  }

  try {
    const response = await prisma.tag.update({
      where: {
        id,
      },
      data: {
        name,
        color,
      },
    });
    return NextResponse.json(response);
  } catch (error) {
    if (error.code === "P2002") {
      throw new DubApiError({
        code: "conflict",
        message: "A tag with that name already exists.",
      });
    }

    throw error;
  }
});

export const PUT = PATCH;

// DELETE /api/workspaces/[idOrSlug]/tags/[id] – delete a tag for a workspace
export const DELETE = withWorkspace(async ({ params, workspace }) => {
  const { id } = params;
  try {
    const response = await prisma.tag.delete({
      where: {
        id,
        projectId: workspace.id,
      },
      include: {
        links: true,
      },
    });

    if (!response) {
      throw new DubApiError({
        code: "not_found",
        message: "Tag not found.",
      });
    }

    // update links metadata in tinybird after deleting a tag
    await Promise.all(
      response.links.map(async ({ linkId }) => {
        const link = await prisma.link.findUnique({
          where: {
            id: linkId,
          },
          include: {
            tags: true,
          },
        });
        if (!link) {
          return null;
        }
        return await recordLink({ link });
      }),
    );

    return NextResponse.json(response);
  } catch (error) {
    if (error.code === "P2025") {
      throw new DubApiError({
        code: "not_found",
        message: "Tag not found.",
      });
    }

    throw error;
  }
});
