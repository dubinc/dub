import "dotenv-flow/config";
import prisma from "@/lib/prisma";
import { redis } from "./utils";
import { qstash } from "@/lib/cron";

const anchor = 2250;

async function main() {
  const expiredLinks = await prisma.link.findMany({
    where: {
      expiresAt: {
        gt: new Date("2023-12-20T02:10:00.000Z"),
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
    skip: anchor,
  });

  const pipeline = redis.pipeline();
  //   redisLinks.forEach((link, idx) => {
  //     const { domain, key } = expiredLinks[idx];
  //     console.log({ domain, key });
  //     pipeline.set(`${domain}:${key}`, {
  //       ...link,
  //       expired: true,
  //     });
  //   });

  //   await Promise.all(
  //     expiredLinks.map((link) => {
  //       const { domain, key } = link;
  //       pipeline.persist(`${domain}:${key}`);
  //       qstash.publishJSON({
  //         url: "https://app.dub.co/api/callback/expire",
  //         delay:
  //           (new Date(link.expiresAt!).getTime() - new Date().getTime()) / 1000,
  //         body: {
  //           linkId: link.id,
  //         },
  //       });
  //     }),
  //   );

  //   await pipeline.exec();

  console.log(`Synced ${expiredLinks.length} links`);
  // table log the last 10 links
  console.table(expiredLinks.slice(-10));
}

main();
