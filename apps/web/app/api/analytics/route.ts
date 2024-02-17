import { withAuth } from "@/lib/auth";
import { handleAndReturnErrorResponse } from "@/lib/errors";
import prisma from "@/lib/prisma";
import z, { domainKeySchema } from "@/lib/zod";
import { booleanQuerySchema } from "@/lib/zod/schemas";
import { NextResponse } from "next/server";

const updatePublicStatsSchema = z.object({
  publicStats: booleanQuerySchema,
});

// GET /api/analytics – get the publicStats setting for a link
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

// PUT /api/analytics – update the publicStats setting for a link
export const PUT = withAuth(async ({ req, searchParams }) => {
  try {
    const { domain, key } = domainKeySchema.parse(searchParams);
    const { publicStats } = updatePublicStatsSchema.parse(await req.json());
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
