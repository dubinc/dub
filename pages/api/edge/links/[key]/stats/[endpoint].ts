import type { NextRequest } from "next/server";
import { getStats } from "@/lib/stats";
import { getLinkViaEdge } from "@/lib/planetscale";

export const config = {
  runtime: "experimental-edge",
};

export default async function handler(req: NextRequest) {
  if (req.method === "GET") {
    const key = req.nextUrl.searchParams.get("key");
    const interval = req.nextUrl.searchParams.get("interval") || "24h";
    const endpoint = req.nextUrl.searchParams.get("endpoint");
    const domain = req.nextUrl.searchParams.get("domain") || "dub.sh";

    if (domain !== "dub.sh") {
      const data = await getLinkViaEdge(key, domain);
      if (!data.publicStats) {
        return new Response(`Method ${req.method} Not Allowed`, {
          status: 405,
        });
      }
    }

    const response = await getStats({
      domain,
      key,
      endpoint,
      interval,
    });
    if (!response) {
      return new Response(`Method ${req.method} Not Allowed`, { status: 405 });
    }

    return new Response(JSON.stringify(response), { status: 200 });
  } else {
    return new Response(`Method ${req.method} Not Allowed`, { status: 405 });
  }
}
