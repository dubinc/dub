import { prisma } from "@dub/prisma";
import { LEGAL_WORKSPACE_ID } from "@dub/utils";
import "dotenv-flow/config";
import { linkCache } from "../lib/api/links/cache";

async function main() {
  const links = await prisma.link.findMany({
    where: {
      projectId: LEGAL_WORKSPACE_ID,
      url: {
        contains: "xxxxxxx",
      },
      domain: "dub.sh",
    },
    select: {
      id: true,
      domain: true,
      key: true,
    },
    take: 1000,
  });

  const redisRes = await linkCache.expireMany(links);

  const prismaRes = await prisma.link.updateMany({
    where: {
      id: {
        in: links.map((link) => link.id),
      },
    },
    data: {
      projectId: "xxx",
      userId: "xxx",
    },
  });

  console.table(links);
  console.table(redisRes);
  console.table(prismaRes);
}

main();
