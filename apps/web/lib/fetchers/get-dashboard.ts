import { prismaEdge } from "@dub/prisma/edge";
import { cache } from "react";

export const getDashboard = cache(async ({ id }: { id: string }) => {
  return await prismaEdge.dashboard.findUnique({
    where: {
      id,
    },
    select: {
      id: true,
      showConversions: true,
      link: {
        select: {
          domain: true,
          key: true,
          url: true,
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
