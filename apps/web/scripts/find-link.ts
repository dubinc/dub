import { prisma } from "@dub/prisma";
import "dotenv-flow/config";

async function main() {
  const links = await prisma.link.findMany({
    where: {
      projectId: "xxx",
      url: "https://example.com",
    },
    select: {
      id: true,
      shortLink: true,
      url: true,
    },
  });

  console.table(links);
}

main();
