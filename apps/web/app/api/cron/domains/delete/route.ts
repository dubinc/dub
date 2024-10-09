import { handleAndReturnErrorResponse } from "@/lib/api/errors";
import { qstash } from "@/lib/cron";
import { verifyQstashSignature } from "@/lib/cron/verify-qstash";
import { redis } from "@/lib/upstash";
import z from "@/lib/zod";
import { APP_DOMAIN_WITH_NGROK } from "@dub/utils";

export const dynamic = "force-dynamic";

const schema = z.object({
  domain: z.string(),
  cursor: z.any().default(0),
});

const BATCH_SIZE = 500;

// Delete the links from Redis for a domain
export async function POST(req: Request) {
  try {
    const body = await req.json();
    await verifyQstashSignature(req, body);

    const { domain, cursor } = schema.parse(body);

    // Scan the database for keys
    const [newCursor, keys] = await redis.scan(cursor, {
      match: `${domain}*`,
      count: BATCH_SIZE,
    });

    // Remove keys from Redis
    if (keys.length > 0) {
      const pipeline = redis.pipeline();
      keys.map((key) => pipeline.del(key));
      await pipeline.exec();
    }

    if (newCursor === 0) {
      return new Response("No keys to delete. Skipping...");
    }

    // Schedule next job
    await qstash.publishJSON({
      url: `${APP_DOMAIN_WITH_NGROK}/api/cron/domains/delete`,
      body: {
        domain,
        cursor: String(newCursor),
      },
    });

    return new Response("Ok");
  } catch (error) {
    return handleAndReturnErrorResponse(error);
  }
}
