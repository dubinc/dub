import { prisma } from "@dub/prisma";
import "dotenv-flow/config";
import { linkCache } from "../lib/api/links/cache";

// script to backfill link cache for links with webhooks
async function main() {
  const links = await prisma.link.findMany({
    where: {
      webhooks: {
        some: {},
      },
    },
    include: {
      webhooks: true,
    },
  });

  console.log(links.length);
  console.log(JSON.stringify(links, null, 2));

  const res = await linkCache.mset(links);
  console.log(res);
}

main();
