import { prisma } from "@/lib/prisma";

import "dotenv-flow/config";

async function main() {
  const links = await prisma.link.updateMany({
    where: {
      domain: "xxx",
    },
    data: {
      publicStats: true,
    },
  });

  console.log(links);
}

main();
