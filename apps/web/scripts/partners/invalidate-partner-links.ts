import { prisma } from "@dub/prisma";
import "dotenv-flow/config";
import { linkCache } from "../../lib/api/links/cache";

// one time script to invalidate partner links
async function main() {
  const links = await prisma.link.findMany({
    where: {
      programId: {
        not: null,
      },
      partnerId: {
        not: null,
      },
      // last clicked within the last 24 hours (would've been cached)
      lastClicked: {
        gte: new Date(Date.now() - 24 * 60 * 60 * 1000),
      },
    },
    skip: 0,
    take: 200,
  });

  const res = await linkCache.expireMany(links);
  console.log(res);
}

main();
