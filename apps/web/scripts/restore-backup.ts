import { bulkCreateLinks } from "@/lib/api/links";
import { ProcessedLinkProps } from "@/lib/types";
import { redis } from "@/lib/upstash";
import { prisma } from "@dub/prisma";
import "dotenv-flow/config";

const domain = "xxx";

async function main() {
  const restoredData = await redis.lrange<ProcessedLinkProps>(
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
