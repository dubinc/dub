import { prisma } from "@dub/prisma";
import { Prisma } from "@prisma/client";
import "dotenv-flow/config";

async function main() {
  const domains = await prisma.domain.findMany({
    where: {
      deepviewData: {
        equals: Prisma.AnyNull,
      },
    },
    take: 1000,
  });

  const deepviewData = await prisma.domain.updateMany({
    where: {
      id: { in: domains.map((domain) => domain.id) },
    },
    data: { deepviewData: {} },
  });

  console.log(deepviewData);
}

main();
