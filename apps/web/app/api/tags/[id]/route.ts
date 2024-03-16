import { DubApiError } from "@/lib/api/errors";
import { withAuth } from "@/lib/auth/utils";
import prisma from "@/lib/prisma";
import { recordLink } from "@/lib/tinybird";
import { updateTagBodySchema } from "@/lib/zod/schemas/tags";
import { NextResponse } from "next/server";

// PUT /api/projects/[slug]/tags/[id] – update a tag for a project
export const PUT = withAuth(async ({ req, params }) => {
  const { id } = params;
  const { name, color } = updateTagBodySchema.parse(await req.json());

  const tag = await prisma.tag.findUnique({
    where: {
      id,
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

// DELETE /api/projects/[slug]/tags/[id] – delete a tag for a project
export const DELETE = withAuth(async ({ params }) => {
  const { id } = params;
  try {
    const response = await prisma.tag.delete({
      where: {
        id,
      },
      include: {
        linksNew: true,
      },
    });

    // update links metadata in tinybird after deleting a tag
    await Promise.all(
      response.linksNew.map(async ({ linkId }) => {
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
