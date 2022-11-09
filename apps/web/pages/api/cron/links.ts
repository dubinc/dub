import type { NextApiRequest, NextApiResponse } from "next";
import { verifySignature } from "@upstash/qstash/nextjs";
import prisma from "@/lib/prisma";
import { redis } from "@/lib/upstash";

/**
 * Cron to update link count
 * Runs every 15 minutes (we'll increase this as number of links increase)
 **/

async function handler(_req: NextApiRequest, res: NextApiResponse) {
  try {
    const links = await prisma.link.findMany({
      select: {
        id: true,
        domain: true,
        key: true,
        clicks: true,
      },
      orderBy: {
        clicksUpdatedAt: "asc",
      },
      take: 100,
    });
    const start = Date.now() - 2629746000; // 30 days ago
    const pipeline = redis.pipeline();
    for (const { domain, key } of links) {
      pipeline.zcount(`${domain}:clicks:${key}`, start, Date.now());
    }
    const results = await pipeline.exec();
    const response = await Promise.all(
      links.map(({ domain, key }, index) => {
        const newClicks = results[index];
        return prisma.link.update({
          where: {
            domain_key: {
              domain,
              key,
            },
          },
          data: {
            clicks: newClicks,
            clicksUpdatedAt: new Date(),
          },
        });
      }),
    );

    res.status(200).json(response);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}

/**
 * verifySignature will try to load `QSTASH_CURRENT_SIGNING_KEY` and `QSTASH_NEXT_SIGNING_KEY` from the environment.

 * To test out the endpoint manually (wihtout using QStash), you can do `export default handler` instead and
 * hit this endpoint via http://localhost:3000/api/cron/domains
 */
export default verifySignature(handler);

export const config = {
  api: {
    bodyParser: false,
  },
};
