import { cache } from "react";
import { prismaEdge } from "../prisma/edge";

export const getDashboard = cache(async ({ id }: { id: string }) => {
  return await prismaEdge.dashboard.findUnique({
    where: {
      id,
    },
    select: {
      id: true,
      doIndex: true,
      password: true,
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
