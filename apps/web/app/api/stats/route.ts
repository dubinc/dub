import { withAuth } from "@/lib/auth";
import { ErrorResponse, handleApiError } from "@/lib/errors";
import prisma from "@/lib/prisma";
import { DomainKeySchema } from "@/lib/zod";
import { NextResponse } from "next/server";

// GET /api/stats – get the publicStats setting for a link
export const GET = withAuth(async ({ searchParams }) => {
  try {
    const { domain, key } = DomainKeySchema.parse(searchParams);

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
  } catch (err) {
    const { error, status } = handleApiError(err);
    return NextResponse.json<ErrorResponse>({ error }, { status });
  }
});

// PUT /api/stats – update the publicStats setting for a link
export const PUT = withAuth(async ({ req, searchParams }) => {
  try {
    const { domain, key } = DomainKeySchema.parse(searchParams);

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
  } catch (err) {
    const { error, status } = handleApiError(err);
    return NextResponse.json<ErrorResponse>({ error }, { status });
  }
});
