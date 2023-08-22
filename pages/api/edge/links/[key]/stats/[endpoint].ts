import type { NextRequest } from "next/server";
import { getStats } from "#/lib/stats";
import { getLinkViaEdge } from "#/lib/planetscale";
import { ipAddress } from "@vercel/edge";
import { LOCALHOST_IP, isHomeHostname } from "#/lib/constants";
import { ratelimit } from "#/lib/upstash";
import { isBlacklistedReferrer } from "#/lib/edge-config";

export const config = {
  runtime: "edge",
};

export default async function handler(req: NextRequest) {
  if (req.method === "GET") {
    const key = req.nextUrl.pathname.split("/")[4];
    const interval = req.nextUrl.searchParams.get("interval");
    const endpoint = req.nextUrl.searchParams.get("endpoint") as string;
    let domain = req.nextUrl.hostname;
    if (isHomeHostname(domain)) domain = "dub.sh";

    if (process.env.NODE_ENV !== "development" && domain === "dub.sh") {
      if (
        key === "github" &&
        (await isBlacklistedReferrer(req.headers.get("referer")))
      ) {
        return new Response("Don't DDoS me pls 🥺", { status: 429 });
      }
      const ip = ipAddress(req) || LOCALHOST_IP;
      const { success } = await ratelimit(
        15,
        key === "github" && endpoint !== "clicks" ? "1 h" : "10 s",
      ).limit(`${ip}:${domain}:${key}:${endpoint}`);

      if (!success) {
        return new Response("Don't DDoS me pls 🥺", { status: 429 });
      }
    }

    let data;
    // if the link is NOT dub.sh/github (demo link)
    if (!(domain === "dub.sh" && key === "github")) {
      data = await getLinkViaEdge(domain, key);
      // if the link is explicitly private (publicStats === false)
      // or if the link doesn't exist in database (data === undefined) and is not a dub.sh link
      // (we need to exclude dub.sh public demo links here)
      if (data?.publicStats === 0 || (domain !== "dub.sh" && !data)) {
        return new Response(`Stats for this link are not public`, {
          status: 403,
        });
      }
      // return 403 if interval is 90d or all
      if (interval === "all" || interval === "90d") {
        return new Response(`Require higher plan`, { status: 403 });
      }
    }

    const response = await getStats({
      domain,
      key,
      endpoint,
      interval,
    });

    return new Response(JSON.stringify(response), { status: 200 });
  } else {
    return new Response(`Method ${req.method} Not Allowed`, { status: 405 });
  }
}
