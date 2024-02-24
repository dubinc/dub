import { withAuth } from "@/lib/auth";
import { DubApiError, handleAndReturnErrorResponse } from "@/lib/errors";
import prisma from "@/lib/prisma";
import { updateTagBodySchema } from "@/lib/zod/schemas/tags";
import { NextResponse } from "next/server";

// PUT /api/projects/[slug]/tags/[id] – update a tag for a project
export const PUT = withAuth(async ({ req, params }) => {
  const { id } = params;
  try {
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

    const response = await prisma.tag.update({
      where: {
        id,
      },
      data: {
        name,
        color: color as any,
      },
    });
    return NextResponse.json(response);
  } catch (error) {
    return handleAndReturnErrorResponse(error);
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
    });
    return NextResponse.json(response);
  } catch (error) {
    return handleAndReturnErrorResponse(error);
  }
});
