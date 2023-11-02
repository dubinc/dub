import { withAuth } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { NextResponse } from "next/server";

// PUT /api/projects/[slug]/tags/[id] – update a tag for a project
export const PUT = withAuth(async ({ req, params }) => {
  const { id } = params;
  const { name, color } = await req.json();
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
