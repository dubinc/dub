import { bulkCreateLinks } from "@/lib/api/links";
import prisma from "@/lib/prisma";
import { LinkWithTagIdsProps } from "@/lib/types";
import "dotenv-flow/config";
import { redis } from "@/lib/upstash";

const domain = "xxx";

async function main() {
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
