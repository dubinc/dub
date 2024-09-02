import { prisma } from "@/lib/prisma";
import { cache } from "react";
import { getSession } from "./auth";

export const getDefaultWorkspace = cache(async () => {
  const session = await getSession();
  if (!session) {
    return null;
  }
  return await prisma.project.findFirst({
    where: {
      users: {
        some: {
          userId: session.user.id,
        },
      },
    },
    select: {
      slug: true,
    },
  });
});
