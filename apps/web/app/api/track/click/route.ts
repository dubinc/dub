import { recordClick } from "@/lib/tinybird";
import { NextResponse } from "next/server";
import { internal_runWithWaitUntil as waitUntil } from "next/dist/server/web/internal-edge-wait-until";
import { nanoid } from "@dub/utils";
import { withAuthEdge } from "@/lib/auth-edge";
import { redis } from "@/lib/upstash";
import { RedisLinkProps } from "@/lib/types";
import { parseUrl } from "@/lib/middleware/utils";
import { z } from 'zod';
import { getLinkViaEdgeByURL } from "@/lib/planetscale";

export const runtime = "edge";

const ClickEventSchema = z.object({
  url: z.string().url(),
});

// POST /api/track/click – post click event
export const POST = withAuthEdge(async ({ req }) => {
  const body = ClickEventSchema.parse(await req.json());
  const { url } = body;
  const { domain, key } = parseUrl(url);

  let link;
  if (url.includes("via=")) {
    link = await getLinkViaEdgeByURL(url);
  } else {
    link = await redis.hget<RedisLinkProps>(domain, key);
  }
  if (!link) {
    return NextResponse.json("Link not found", { status: 404 });
  }
  const click_id = nanoid(16);

  waitUntil(async () => {
    await recordClick({
      req,
      id: link!.id,
      url,
    });
  });

  return NextResponse.json({
    click_id,
  });
}, {});
