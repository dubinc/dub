import { withAdmin } from "@/lib/auth";
import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { DUB_DOMAINS, LEGAL_USER_ID, ensureArray } from "@dub/utils";

// GET /api/links – get all user links
export const GET = withAdmin(async ({ searchParams }) => {
  const {
    domain,
    tagId,
    search,
    sort = "createdAt",
    page,
    userId,
  } = searchParams as {
    domain?: string;
    tagId?: string | string[];
    search?: string;
    sort?: "createdAt" | "clicks" | "lastClicked";
    page?: string;
    userId?: string;
  };

  const tagIds = ensureArray(tagId ?? []);

  const response = await prisma.link.findMany({
    where: {
      ...(domain
        ? { domain }
        : {
            domain: {
              in: DUB_DOMAINS.map((domain) => domain.slug),
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
      OR: [
        {
          userId: {
            not: LEGAL_USER_ID,
          },
        },
        {
          userId: null,
        },
      ],
      ...(tagIds?.length && {
        tags: { some: { tagId: { in: tagIds } } },
      }),
    },
    include: {
      user: true,
      tags: {
        include: {
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
    orderBy: {
      [sort]: "desc",
    },
    take: 100,
    ...(page && {
      skip: (parseInt(page) - 1) * 100,
    }),
  });

  const links = response.map((link) => ({
    ...link,
    tags: link.tags.map(({ tag }) => tag),
  }));

  return NextResponse.json(links);
});
