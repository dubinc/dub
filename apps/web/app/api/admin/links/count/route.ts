import { withAdmin } from "@/lib/auth";
import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { DUB_DOMAINS, LEGAL_USER_ID } from "@dub/utils";

// GET /api/admin/links/count
export const GET = withAdmin(async ({ searchParams }) => {
  let { groupBy, search, domain, tagId } = searchParams as {
    groupBy?: "domain" | "tagId";
    search?: string;
    domain?: string;
    tagId?: string;
  };

  let response;

  if (groupBy) {
    response = await prisma.link.groupBy({
      by: [groupBy],
      where: {
        ...(search && {
          OR: [
            {
              key: { contains: search },
            },
            {
              url: { contains: search },
            },
          ],
        }),
        // when filtering by domain, only filter by domain if the filter group is not "Domains"
        ...(domain && groupBy !== "domain"
          ? {
              domain,
            }
          : {
              domain: {
                in: DUB_DOMAINS.map((domain) => domain.slug),
              },
            }),
        userId: {
          not: LEGAL_USER_ID,
        },
      },
      _count: true,
      orderBy: {
        _count: {
          [groupBy]: "desc",
        },
      },
    });
  } else {
    response = await prisma.link.count({
      where: {
        ...(search && {
          OR: [
            {
              key: { contains: search },
            },
            {
              url: { contains: search },
            },
          ],
        }),
        ...(domain
          ? { domain }
          : {
              domain: {
                in: DUB_DOMAINS.map((domain) => domain.slug),
              },
            }),
        ...(tagId && { tagId }),
      },
    });
  }

  return NextResponse.json(response);
});
