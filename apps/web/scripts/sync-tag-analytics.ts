import { recordLink } from "@/lib/tinybird";
import { prisma } from "@dub/prisma";
import "dotenv-flow/config";

async function main() {
  const links = await prisma.link.findMany({
    where: {
      tags: {
        some: {},
      },
    },
    include: {
      tags: {
        select: {
          tag: true,
        },
      },
    },
    orderBy: {
      createdAt: "asc",
    },
    skip: 0,
    take: 1000,
  });

  const res = await recordLink(links);

  console.log(res);
}

main();
