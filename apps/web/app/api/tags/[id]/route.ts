import { DubApiError } from "@/lib/api/errors";
import { withWorkspace } from "@/lib/auth";
import { linkTagDeletedJob } from "@/lib/jobs/handlers/link-tag-deleted-job";
import { prisma } from "@/lib/prisma";
import { LinkTagSchema, updateTagBodySchema } from "@/lib/zod/schemas/tags";
import { waitUntil } from "@vercel/functions";
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
    const { id: tagId } = params;

    const { count } = await prisma.tag.updateMany({
      where: {
        id: tagId,
        projectId: workspace.id,
      },
      data: {
        projectId: null,
      },
    });

    if (count === 0) {
      throw new DubApiError({
        code: "not_found",
        message: "Tag not found.",
      });
    }

    waitUntil(
      linkTagDeletedJob.dispatch(
        {
          tagId,
        },
        {
          label: tagId,
        },
      ),
    );

    return NextResponse.json({
      id: tagId,
    });
  },
  {
    requiredPermissions: ["tags.write"],
  },
);
