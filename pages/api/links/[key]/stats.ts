import type { NextRequest } from "next/server";
import { redis } from "@/lib/redis";
import {
  IntervalProps,
  processData,
  intervalData,
  RawStatsProps,
} from "@/lib/stats";

export const config = {
  runtime: "experimental-edge",
};

export default async function handler(req: NextRequest) {
  if (req.method === "GET") {
    const url = req.nextUrl.pathname;
    const key = url.split("/")[3];
    const interval = req.nextUrl.searchParams.get("interval") as
      | IntervalProps
      | undefined;
    const start = Date.now() - intervalData[interval || "7d"].milliseconds;
    const end = Date.now();
    const response = await redis.zrange<RawStatsProps[]>(
      `dub.sh:${key}:clicks`,
      start,
      end,
      {
        byScore: true,
      }
    );
    const data = await processData(key, response, interval);
    return new Response(JSON.stringify(data), { status: 200 });
  } else {
    return new Response(`Method ${req.method} Not Allowed`, { status: 405 });
  }
}
