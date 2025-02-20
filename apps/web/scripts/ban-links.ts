import { prisma } from "@dub/prisma";
import { LEGAL_USER_ID, LEGAL_WORKSPACE_ID } from "@dub/utils";
import "dotenv-flow/config";
import { linkCache } from "../lib/api/links/cache";

async function main() {
  const links = await prisma.link.findMany({
    where: {
      domain: "dub.sh",
      url: {
        contains: "kurtdavisjr.com",
      },
      projectId: {
        not: LEGAL_WORKSPACE_ID,
      },
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
      projectId: LEGAL_WORKSPACE_ID,
      userId: LEGAL_USER_ID,
    },
  });

  console.table(links);
  console.table(redisRes);
  console.table(prismaRes);
}

main();
