import { withAdmin } from "@/lib/auth";
import { prisma } from "@dub/prisma";
import { DUB_DOMAINS_ARRAY, LEGAL_USER_ID } from "@dub/utils";
import { NextResponse } from "next/server";

// GET /api/admin/links
export const GET = withAdmin(async ({ searchParams }) => {
  const {
    domain,
    search,
    sort = "createdAt",
    page,
  } = searchParams as {
    domain?: string;
    search?: string;
    sort?: "createdAt" | "clicks" | "lastClicked";
    page?: string;
  };

  const response = await prisma.link.findMany({
    where: {
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
      ...(domain
        ? { domain }
        : {
            domain: {
              in: DUB_DOMAINS_ARRAY,
            },
          }),
      ...(search && {
        shortLink: search,
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
