import { withAuth } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { randomBadgeColor } from "@/ui/links/tag-badge";
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
  if (project.plan === "free" && tagsCount >= 3) {
    return new Response(
      "You can only create 3 tags in the Free plan. Upgrade to Pro to create unlimited tags.",
      {
        status: 403,
      },
    );
  }
  const { tag } = await req.json();
  const response = await prisma.tag.create({
    data: {
      name: tag,
      color: randomBadgeColor(),
      projectId: project.id,
    },
  });
  return NextResponse.json(response, { headers });
});
