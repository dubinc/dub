import "dotenv-flow/config";
import prisma from "@/lib/prisma";
import { redis, chunk } from "./utils";
import { RedisLinkProps } from "@/lib/types";

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
