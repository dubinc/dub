import { DubApiError } from "@/lib/api/errors";
import { markLinkTagDeleted } from "@/lib/api/tags/mark-link-tag-deleted";
import { withWorkspace } from "@/lib/auth";
import { LinkTagSchema, updateTagBodySchema } from "@/lib/zod/schemas/tags";
import { prisma } from "@dub/prisma";
import { NextResponse } from "next/server";

// PATCH /api/tags/[id] – update a tag for a workspace
export const PATCH = withWorkspace(
  async ({ req, params, workspace }) => {
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

      return NextResponse.json(LinkTagSchema.parse(response));
    } catch (error) {
      if (error.code === "P2002") {
        throw new DubApiError({
          code: "conflict",
          message: "A tag with that name already exists.",
        });
      }

      throw error;
    }
  },
  {
    requiredPermissions: ["tags.write"],
  },
);

export const PUT = PATCH;

// DELETE /api/tags/[id] – delete a tag for a workspace
export const DELETE = withWorkspace(
  async ({ params, workspace }) => {
    const { id } = params;

    const deleted = await markLinkTagDeleted({
      tagId: id,
      projectId: workspace.id,
    });

    if (!deleted) {
      throw new DubApiError({
        code: "not_found",
        message: "Tag not found.",
      });
    }

    return NextResponse.json({ id });
  },
  {
    requiredPermissions: ["tags.write"],
  },
);
