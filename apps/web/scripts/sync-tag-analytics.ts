import prisma from "@/lib/prisma";
import { recordLink } from "@/lib/tinybird";
import "dotenv-flow/config";

async function main() {
  const links = await prisma.link.findMany({
    where: {
      tags: {
        some: {},
      },
    },
    include: {
      tags: true,
    },
    orderBy: {
      createdAt: "asc",
    },
    skip: 0,
    take: 1000,
  });

  const res = await Promise.all(links.map((link) => recordLink({ link })));

  console.log(res);
}

main();
