import { withSession } from "@/lib/auth";
import { prisma } from "@dub/prisma";
import { DEFAULT_REDIRECTS, RESERVED_SLUGS } from "@dub/utils";
import { NextResponse } from "next/server";

// GET /api/workspaces/[idOrSlug]/exists – check if a project exists
export const GET = withSession(async ({ params }) => {
  const { idOrSlug: slug } = params;
  if (RESERVED_SLUGS.includes(slug) || DEFAULT_REDIRECTS[slug]) {
    return NextResponse.json(1);
  }
  const project = await prisma.project.findUnique({
    where: {
      slug,
    },
    select: {
      slug: true,
    },
  });
  if (project) {
    return NextResponse.json(1);
  } else {
    return NextResponse.json(0);
  }
});
