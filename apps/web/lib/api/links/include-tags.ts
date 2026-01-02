import { Prisma } from "@dub/prisma";

export const includeTags = {
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
    orderBy: {
      createdAt: "asc",
    },
  },
} satisfies Prisma.LinkInclude;
