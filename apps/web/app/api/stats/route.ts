import { withAuth } from "@/lib/auth-app";
import prisma from "@/lib/prisma";
import { NextResponse } from "next/server";

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
