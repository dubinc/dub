import { DubApiError } from "@/lib/api/errors";
import { transformLink } from "@/lib/api/links";
import { withAuth } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { domainKeySchema } from "@/lib/zod/schemas";
import { NextResponse } from "next/server";

// GET /api/links/info – get the info for a link
export const GET = withAuth(async ({ headers, searchParams }) => {
  const { domain, key } = domainKeySchema.parse(searchParams);

  const link = await prisma.link.findUnique({
    where: {
      domain_key: {
        domain,
        key,
      },
    },
    include: {
      user: true,
      tags: {
        select: {
          tag: {
            select: {
              id: true,
              name: true,
              color: true,
            },
          },
        },
      },
    },
  });

  if (!link) {
    throw new DubApiError({
      code: "not_found",
      message: "Link not found.",
    });
  }

  return NextResponse.json(transformLink(link), {
    headers,
  });
});
