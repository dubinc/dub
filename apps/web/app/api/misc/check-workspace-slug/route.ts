import { withSession } from "@/lib/auth";
import { prisma } from "@dub/prisma";
import { DEFAULT_REDIRECTS, RESERVED_SLUGS } from "@dub/utils";
import { NextResponse } from "next/server";

// GET /api/misc/check-workspace-slug – check if a workspace slug is available
export const GET = withSession(async ({ searchParams }) => {
  const { slug } = searchParams;

  if (!slug) {
    return NextResponse.json(
      { error: "Slug parameter is required" },
      { status: 400 },
    );
  }

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
