import { prisma } from "@dub/prisma";
import { cache } from "react";

export const getProgramSlugs = cache(async () =>
  prisma.program.findMany({
    select: {
      slug: true,
    },
  }),
);
