import { prisma } from "@/lib/prisma";
import { WorkspaceEnvironment } from "@prisma/client";
import { cache } from "react";

export const getProgramSlugs = cache(async () =>
  prisma.program.findMany({
    where: {
      workspace: {
        environment: WorkspaceEnvironment.production,
      },
    },
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
