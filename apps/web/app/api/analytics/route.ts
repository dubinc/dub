import { withAuth } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { NextResponse } from "next/server";

// GET /api/stats – get the publicStats setting for a link
export const GET = withAuth(async ({ searchParams }) => {
  const { domain, key } = searchParams;
  if (!domain || !key) {
    return new Response("Missing domain or key", { status: 400 });
  }
  const response = await prisma.link.findUnique({
    where: {
      domain_key: {
        domain,
        key,
      },
    },
    select: {
      publicStats: true,
    },
  });
  return NextResponse.json(response);
});

// PUT /api/stats – update the publicStats setting for a link
export const PUT = withAuth(async ({ req, searchParams }) => {
  const { domain, key } = searchParams;
  if (!domain || !key) {
    return new Response("Missing domain or key", { status: 400 });
  }
  const { publicStats } = await req.json();
  const response = await prisma.link.update({
    where: {
      domain_key: {
        domain,
        key,
      },
    },
    data: {
      publicStats,
    },
  });
  return NextResponse.json(response);
});
