import { withAuth } from "@/lib/auth";
import { handleAndReturnErrorResponse } from "@/lib/errors";
import prisma from "@/lib/prisma";
import { domainKeySchema } from "@/lib/zod";
import { NextResponse } from "next/server";

// GET /api/stats – get the publicStats setting for a link
export const GET = withAuth(async ({ searchParams }) => {
  try {
    const { domain, key } = domainKeySchema.parse(searchParams);

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
  } catch (error) {
    return handleAndReturnErrorResponse(error);
  }
});

// PUT /api/stats – update the publicStats setting for a link
export const PUT = withAuth(async ({ req, searchParams }) => {
  try {
    const { domain, key } = domainKeySchema.parse(searchParams);

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
  } catch (error) {
    return handleAndReturnErrorResponse(error);
  }
});
