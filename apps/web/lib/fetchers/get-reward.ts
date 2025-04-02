import { prisma } from "@dub/prisma";
import { cache } from "react";

export const getReward = cache(async ({ id }: { id: string }) => {
  return await prisma.reward.findUniqueOrThrow({
    where: {
      id,
    },
  });
});
