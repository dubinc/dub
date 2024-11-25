import { cache } from "react";
import { prisma } from "../prisma";

export const getProgram = cache(async ({ slug }: { slug: string }) => {
  return await prisma.program.findUnique({
    where: {
      slug,
    },
  });
});
