import { prisma } from "@dub/prisma";
import "dotenv-flow/config";
import { redis } from "../lib/upstash";

const batch = 3;

// script to remove old redis link cache entries
async function main() {
  const domains = await prisma.domain.findMany({
    orderBy: {
      createdAt: "asc",
    },
    take: 500,
    skip: batch * 500,
  });

  for (const domain of domains) {
    const res = await redis.del(domain.slug);
    console.log(`Deleted ${domain.slug} from redis: ${res}`);
  }
}

main();
