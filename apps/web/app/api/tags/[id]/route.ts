import { withAuth } from "@/lib/auth";
import { handleAndReturnErrorResponse } from "@/lib/errors";
import prisma from "@/lib/prisma";
import z from "@/lib/zod";
import { tagColorSchema } from "@/lib/zod/schemas/tags";
import { NextResponse } from "next/server";

const updateTagSchema = z.object({
  name: z.string().min(1),
  color: tagColorSchema,
});

// PUT /api/projects/[slug]/tags/[id] – update a tag for a project
export const PUT = withAuth(async ({ req, params }) => {
  const { id } = params;
  try {
    const { name, color } = updateTagSchema.parse(await req.json());
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
    return handleAndReturnErrorResponse(error);
  }
});

// DELETE /api/projects/[slug]/tags/[id] – delete a tag for a project
export const DELETE = withAuth(async ({ params }) => {
  const { id } = params;
  const response = await prisma.tag.delete({
    where: {
      id,
    },
  });
  return NextResponse.json(response);
});
