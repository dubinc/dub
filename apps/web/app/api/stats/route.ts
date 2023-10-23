import { withAuth } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { NextResponse } from "next/server";

// GET /api/stats – get the publicStats setting for a link
export const GET = withAuth(async ({ searchParams }) => {
  const { domain, key } = searchParams;
  const response = await prisma.link.findUnique({
    where: {
      domain_key: {
        domain: domain || "dub.sh",
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
  const { publicStats } = await req.json();
  const response = await prisma.link.update({
    where: {
      domain_key: {
        domain: domain || "dub.sh",
        key,
      },
    },
    data: {
      publicStats,
    },
  });
  return NextResponse.json(response);
});
