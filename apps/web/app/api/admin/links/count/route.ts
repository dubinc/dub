import { withAdmin } from "@/lib/auth";
import { prisma } from "@dub/prisma";
import { DUB_DOMAINS_ARRAY, LEGAL_USER_ID } from "@dub/utils";
import { NextResponse } from "next/server";

// GET /api/admin/links/count
export const GET = withAdmin(async ({ searchParams }) => {
  let { groupBy, search, domain, tagId } = searchParams as {
    groupBy?: "domain" | "tagId" | "userId";
    search?: string;
    domain?: string;
    tagId?: string;
  };

  let response;

  const tagIds = tagId ? tagId.split(",") : [];

  const linksWhere = {
    userId: {
      not: LEGAL_USER_ID,
    },
    // when filtering by domain, only filter by domain if the filter group is not "Domains"
    ...(domain && groupBy !== "domain"
      ? {
          domain,
        }
      : {
          domain: {
            in: DUB_DOMAINS_ARRAY,
          },
        }),
    ...(search && {
      OR: [
        {
          shortLink: { contains: search },
        },
        {
          url: { contains: search },
        },
      ],
    }),
  };

  if (groupBy === "tagId") {
    response = await prisma.linkTag.groupBy({
      by: ["tagId"],
      where: {
        link: linksWhere,
      },
      _count: true,
      orderBy: {
        _count: {
          tagId: "desc",
        },
      },
    });
  } else {
    const where = {
      ...linksWhere,
      ...(tagIds.length > 0 && {
        tags: {
          some: {
            tagId: {
              in: tagIds,
            },
          },
        },
      }),
    };

    if (groupBy) {
      response = await prisma.link.groupBy({
        by: [groupBy],
        where,
        _count: true,
        orderBy: {
          _count: {
            [groupBy]: "desc",
          },
        },
        take: 500,
      });
    } else {
      response = await prisma.link.count({
        where,
      });
    }
  }
  return NextResponse.json(response);
});
