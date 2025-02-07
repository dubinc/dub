import { prisma } from "@dub/prisma";
import { Prisma } from "@prisma/client";
import { cache } from "react";

export const getLink = cache(
  async ({
    where,
    select,
  }: {
    where: Prisma.LinkWhereUniqueInput;
    select?: Prisma.LinkSelect;
  }) => {
    return await prisma.link.findUnique({
      where,
      select,
    });
  },
);
