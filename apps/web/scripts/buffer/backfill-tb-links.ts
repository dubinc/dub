import { prisma } from "@dub/prisma";
import { Prisma } from "@dub/prisma/client";
import "dotenv-flow/config";

async function main() {
  const where: Prisma.LinkWhereInput = {
    projectId: "cm05wnnpo000711ztj05wwdbu",
    folderId: "fold_1JNQBVZV8P0NA0YGB11W2HHSQ",
    archived: false,
    createdAt: {
      // lte: new Date("2025-04-09T04:25:34Z"),
      gt: new Date("2025-03-11T00:00:00Z"),
    },
  };

  // const links = await prisma.link.findMany({
  //   where,
  //   take: 100,
  //   orderBy: {
  //     createdAt: "desc",
  //   },
  // });

  const links = await prisma.link.count({
    where,
  });

  console.log(links);
}

main();
