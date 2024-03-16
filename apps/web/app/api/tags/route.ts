import { DubApiError, exceededLimitError } from "@/lib/api/errors";
import { withAuth } from "@/lib/auth/utils";
import prisma from "@/lib/prisma";
import { createTagBodySchema } from "@/lib/zod/schemas/tags";
import { COLORS_LIST, randomBadgeColor } from "@/ui/links/tag-badge";
import { NextResponse } from "next/server";

// GET /api/projects/[slug]/tags - get all tags for a project
export const GET = withAuth(async ({ project, headers }) => {
  const tags = await prisma.tag.findMany({
    where: {
      projectId: project.id,
    },
    select: {
      id: true,
      name: true,
      color: true,
    },
    orderBy: {
      name: "asc",
    },
  });
  return NextResponse.json(tags, { headers });
});

// POST /api/projects/[slug]/tags - create a tag for a project
export const POST = withAuth(async ({ req, project, headers }) => {
  const tagsCount = await prisma.tag.count({
    where: {
      projectId: project.id,
    },
  });

  if (tagsCount >= project.tagsLimit) {
    throw new DubApiError({
      code: "exceeded_limit",
      message: exceededLimitError({
        plan: project.plan,
        limit: project.tagsLimit,
        type: "tags",
      }),
    });
  }

  const { tag, color } = createTagBodySchema.parse(await req.json());

  const existingTag = await prisma.tag.findFirst({
    where: {
      projectId: project.id,
      name: tag,
    },
  });

  if (existingTag) {
    throw new DubApiError({
      code: "conflict",
      message: "A tag with that name already exists.",
    });
  }

  const response = await prisma.tag.create({
    data: {
      name: tag,
      color:
        color && COLORS_LIST.map(({ color }) => color).includes(color)
          ? color
          : randomBadgeColor(),
      projectId: project.id,
    },
  });

  return NextResponse.json(response, { headers, status: 201 });
});
