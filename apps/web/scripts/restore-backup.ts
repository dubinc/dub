import { bulkCreateLinks } from "@/lib/api/links";
import prisma from "@/lib/prisma";
import { redis } from "@/lib/upstash";
import "dotenv-flow/config";

const domain = "xxx";

async function main() {
  // TODO: Figure out the right way to type this (do we need to run processLink for these before creating?)
  const restoredData = await redis.lrange<LinkWithTagIdsProps>(
    "restoredData",
    0,
    -1,
  );

  if (restoredData.length === 0) {
    const links = await prisma.link.findMany({
      where: {
        domain,
      },
    });
    await redis.lpush("restoredData", links);
  } else {
    const response = await bulkCreateLinks({ links: restoredData });
    console.log(response);
    // delete restoredData from redis
    await redis.del("restoredData");
  }
}

main();
