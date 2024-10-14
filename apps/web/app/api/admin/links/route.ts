import { withAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { DUB_DOMAINS_ARRAY } from "@dub/utils";
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
      ...(domain
        ? { domain }
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
