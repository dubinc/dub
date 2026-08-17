import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";

const MAX_SLUGS = 24;

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  // cache for an hour, serve stale for a day while revalidating
  "Vercel-CDN-Cache-Control": "s-maxage=3600, stale-while-revalidate=86400",
  "Cache-Control": "public, max-age=3600, stale-while-revalidate=86400",
};

// GET /api/misc/program-logos?slugs=perplexity,framer – public name + logo for
// marketplace programs, used by the marketing nav to render real program logos
export async function GET(req: NextRequest) {
  const slugs = [
    ...new Set(
      (req.nextUrl.searchParams.get("slugs") ?? "")
        .split(",")
        .map((slug) => slug.trim().toLowerCase())
        .filter(Boolean),
    ),
  ].slice(0, MAX_SLUGS);

  if (slugs.length === 0) {
    return NextResponse.json([], { headers: CORS_HEADERS });
  }

  const programs = await prisma.program.findMany({
    where: {
      slug: {
        in: slugs,
      },
      addedToMarketplaceAt: {
        not: null,
      },
    },
    select: {
      slug: true,
      name: true,
      logo: true,
    },
  });

  const programsBySlug = new Map(
    programs.map((program) => [program.slug, program]),
  );

  // return in the order the slugs were requested
  return NextResponse.json(
    slugs.map((slug) => programsBySlug.get(slug)).filter(Boolean),
    { headers: CORS_HEADERS },
  );
}
