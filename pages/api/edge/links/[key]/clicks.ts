import type { NextRequest } from "next/server";
import { getStats } from "@/lib/stats";
import { conn } from "@/lib/planetscale";

export const config = {
  runtime: "experimental-edge",
};

export default async function handler(req: NextRequest) {
  if (req.method === "GET") {
    const key = req.nextUrl.searchParams.get("key");
    const interval = req.nextUrl.searchParams.get("interval");
    if (!interval) {
      const response = await conn.execute(
        "SELECT clicks FROM Link WHERE domain = ? AND `key` = ?",
        ["dub.sh", key],
      );
      let clicks = 0;
      try {
        clicks = response.rows[0]["clicks"];
        return new Response(JSON.stringify(clicks), { status: 200 });
      } catch (e) {
        console.log(e);
      }
    }

    // if Planetscale fails or no interval is provided, get the total clicks from Tinybird
    const response = await getStats({
      domain: "dub.sh",
      key,
      endpoint: "clicks",
      interval,
    });

    let clicks = 0;
    try {
      clicks = response[0]["count()"];
    } catch (e) {
      console.log(e);
    }

    return new Response(JSON.stringify(clicks), { status: 200 });
  } else {
    return new Response(`Method ${req.method} Not Allowed`, { status: 405 });
  }
}
