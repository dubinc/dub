import { DubApiError } from "@/lib/api/errors";
import { withWorkspace } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { recordLink } from "@/lib/tinybird";
import { TagSchema, updateTagBodySchema } from "@/lib/zod/schemas/tags";
import { NextResponse } from "next/server";

// PATCH /api/workspaces/[idOrSlug]/tags/[id] – update a tag for a workspace
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

      return NextResponse.json(TagSchema.parse(response));
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

// DELETE /api/workspaces/[idOrSlug]/tags/[id] – delete a tag for a workspace
export const DELETE = withWorkspace(
  async ({ params, workspace }) => {
    const { id } = params;
    try {
      const response = await prisma.tag.delete({
        where: {
          id,
          projectId: workspace.id,
        },
        include: {
          links: {
            select: {
              link: {
                select: {
                  id: true,
                  domain: true,
                  key: true,
                  url: true,
                  createdAt: true,
                },
              },
            },
          },
        },
      });

      if (!response) {
        throw new DubApiError({
          code: "not_found",
          message: "Tag not found.",
        });
      }

      // update links metadata in tinybird after deleting a tag
      await recordLink(
        response.links.map(({ link }) => ({
          link_id: link.id,
          domain: link.domain,
          key: link.key,
          url: link.url,
          tag_ids: [],
          workspace_id: workspace.id,
          created_at: link.createdAt,
        })),
      );

      return NextResponse.json({ id });
    } catch (error) {
      if (error.code === "P2025") {
        throw new DubApiError({
          code: "not_found",
          message: "Tag not found.",
        });
      }

      throw error;
    }
  },
  {
    requiredPermissions: ["tags.write"],
  },
);
