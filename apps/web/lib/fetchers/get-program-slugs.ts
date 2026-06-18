import { prisma } from "@/lib/prisma";
import { cache } from "react";

export const getProgramSlugs = cache(async () =>
  prisma.program.findMany({
    select: {
      slug: true,
    },
    orderBy: {
      applications: {
        _count: "desc",
      },
    },
    take: 250,
  }),
);
