import { prismaEdge } from "@dub/prisma/edge";
import { cache } from "react";

export const getDashboard = cache(async ({ id }: { id: string }) => {
  return await prismaEdge.dashboard.findUnique({
    where: {
      id,
    },
    select: {
      id: true,
      doIndex: true,
      password: true,
      link: {
        select: {
          domain: true,
          key: true,
          url: true,
          trackConversion: true,
        },
      },
      project: {
        select: {
          plan: true,
        },
      },
    },
  });
});
