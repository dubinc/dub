import { prisma } from "@dub/prisma";
import { RedisLinkProps } from "@/lib/types";
import { redis } from "@/lib/upstash";
import { chunk } from "@dub/utils";
import "dotenv-flow/config";

async function main() {
  const allExpiredLinks = await prisma.link.findMany({
    where: {
      NOT: {
        expiresAt: null,
      },
    },
    select: {
      id: true,
      domain: true,
      key: true,
      expiresAt: true,
    },
    orderBy: {
      expiresAt: "asc",
    },
    skip: 2000,
  });

  let count = 0;
  const chunks = chunk(allExpiredLinks, 100);

  for (const chunk of chunks) {
    const redisLinks = await redis.mget<RedisLinkProps[]>(
      chunk.map((link) => `${link.domain}:${link.key}`),
    );

    const pipeline = redis.pipeline();
    redisLinks.forEach((link, idx) => {
      const { domain, key, expiresAt } = chunk[idx];
      // @ts-ignore (old version)
      const { expired, ...rest } = link || {};
      // WARNING: OLD VERSION OF REDIS IMPLEMENTATION, WE NOW USE HSET (hashes)
      pipeline.set(`${domain}:${key}`, {
        ...rest,
        expiresAt,
      });
    });

    await pipeline.exec();

    count += chunk.length;

    console.log(`Synced ${count} expired links...`);
  }
}

main();
