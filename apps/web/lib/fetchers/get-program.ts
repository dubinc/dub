import { prisma } from "@dub/prisma";
import { cache } from "react";

export const getProgram = cache(async ({ slug }: { slug: string }) => {
  return await prisma.program.findUnique({
    where: {
      slug,
    },
  });
});
