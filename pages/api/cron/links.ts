import type { NextApiRequest, NextApiResponse } from "next";
import { verifySignature } from "@upstash/qstash/nextjs";
import { log } from "@/lib/cron/utils";
import { redis } from "@/lib/upstash";

/**
 * Cron to delete generic links (links created on dub.sh) that are older than 30 days.
 * Runs once every day.
 **/

async function handler(_req: NextApiRequest, res: NextApiResponse) {
  try {
    const aWeekAgo = Date.now() - 1000 * 60 * 60 * 24 * 7;
    const links = await redis.zrange<string[]>(
      "dub.sh:links:timestamps:generic",
      0,
      aWeekAgo,
      { byScore: true },
    );
    const pipeline = redis.pipeline();
    for (const link of links) {
      pipeline.zrem("dub.sh:links:timestamps:generic", link);
      pipeline.hdel("dub.sh:links", link);
      pipeline.del(`dub.sh:clicks:${link}`);
    }
    const [results, _] = await Promise.all([
      pipeline.exec(),
      log(`Successfully deleted *${links.length}* generic links.`),
    ]);
    res.status(200).json(results);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}

/**
 * verifySignature will try to load `QSTASH_CURRENT_SIGNING_KEY` and `QSTASH_NEXT_SIGNING_KEY` from the environment.

 * To test out the endpoint manually (wihtout using QStash), you can do `export default handler` instead and
 * hit this endpoint via http://localhost:3000/api/cron/links
 */
export default verifySignature(handler);

export const config = {
  api: {
    bodyParser: false,
  },
};
