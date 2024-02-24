import { PrismaClient } from "@prisma/client";

declare global {
  var prisma: PrismaClient | undefined;
}

const prisma =
  global.prisma ||
  (new PrismaClient().$extends({
    result: {
      link: {
        tagId: {
          // @ts-ignore https://github.com/prisma/prisma/issues/20091#issuecomment-1824063594
          needs: { tags: true },
          compute(link) {
            if (!link.tags || !link.tags.length) return null;

            return link.tags[0].tagId;
          },
        },
      },
    },
  }) as PrismaClient);

if (process.env.NODE_ENV === "development") global.prisma = prisma;

export default prisma;
