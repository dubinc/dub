import { withAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { DUB_DOMAINS_ARRAY } from "@dub/utils";
import { NextResponse } from "next/server";

// GET /api/admin/links/count
export const GET = withAdmin(async ({ searchParams }) => {
  let { groupBy, search, domain, tagId } = searchParams as {
    groupBy?: "domain" | "tagId";
    search?: string;
    domain?: string;
    tagId?: string;
  };

  let response;

  const tagIds = tagId ? tagId.split(",") : [];

  const linksWhere = {
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
          key: { contains: search },
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

    if (groupBy === "domain") {
      response = await prisma.link.groupBy({
        by: [groupBy],
        where,
        _count: true,
        orderBy: {
          _count: {
            [groupBy]: "desc",
          },
        },
      });
    } else {
      response = await prisma.link.count({
        where,
      });
    }
  }
  return NextResponse.json(response);
});
