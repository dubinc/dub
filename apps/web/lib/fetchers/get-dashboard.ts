import { prisma } from "@dub/prisma";
import { cache } from "react";

export const getDashboard = cache(async ({ id }: { id: string }) => {
  return await prisma.dashboard.findUnique({
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
      folder: {
        select: {
          id: true,
          name: true,
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
