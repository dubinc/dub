import { withAuth } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { NextResponse } from "next/server";

// GET /api/links/info – get the info for a link
export const GET = withAuth(async ({ headers, searchParams }) => {
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
    include: {
      user: true,
    },
  });
  if (!response) {
    return new Response("Link not found.", {
      status: 404,
      headers,
    });
  }
  return NextResponse.json(response, {
    headers,
  });
});
