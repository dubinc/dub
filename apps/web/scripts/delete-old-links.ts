import { prisma } from "@dub/prisma";
import "dotenv-flow/config";

async function main() {
  const links = await prisma.link.findMany({
    where: {
      domain: "sms.cal.com",
    },
    select: {
      id: true,
      domain: true,
      key: true,
      createdAt: true,
    },
    orderBy: {
      createdAt: "asc",
    },
    take: 500,
  });

  console.table(links);
}

main();
