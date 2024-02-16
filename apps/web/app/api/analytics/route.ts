import { withAuth } from "@/lib/auth";
import { getDomainOrLink } from "@/lib/planetscale";
import prisma from "@/lib/prisma";
import { NextResponse } from "next/server";

// GET /api/analytics – get the publicStats setting for a link
export const GET = withAuth(async ({ searchParams }) => {
  const { domain, key } = searchParams;
  if (!domain || !key) {
    return new Response("Missing domain or key", { status: 400 });
  }
  const response = await getDomainOrLink({ domain, key });
  return NextResponse.json(response);
});

// PUT /api/analytics – update the publicStats setting for a link
export const PUT = withAuth(async ({ req, searchParams }) => {
  const { domain, key } = searchParams;
  if (!domain || !key) {
    return new Response("Missing domain or key", { status: 400 });
  }
  const { publicStats } = await req.json();
  const response =
    key === "_root"
      ? await prisma.domain.update({
          where: { slug: domain },
          data: { publicStats },
        })
      : await prisma.link.update({
          where: { domain_key: { domain, key } },
          data: { publicStats },
        });
  return NextResponse.json(response);
});
