import { prisma } from "@dub/prisma";
import { Prisma } from "@dub/prisma/client";
import "dotenv-flow/config";

async function main() {
  const where: Prisma.LinkWhereInput = {
    projectId: "xxx",
    archived: false,
    folderId: "xxx",
    AND: [
      {
        createdAt: {
          lte: new Date("2025-02-15T15:27:00.000Z"),
        },
      },
      {
        createdAt: {
          gte: new Date("2025-01-29T14:27:00.000Z"),
        },
      },
    ],
  };

  const links = await prisma.link.findMany({
    where,
    select: {
      id: true,
      shortLink: true,
    },
    take: 1000,
    orderBy: {
      createdAt: "asc",
    },
  });

  if (!links.length) {
    console.log("No more links to migrate.");
    return;
  }

  console.table(links);

  await prisma.link.deleteMany({
    where: {
      id: {
        in: links.map((link) => link.id),
      },
    },
  });

  console.log(`Deleted ${links.length} links`);
}

main();
