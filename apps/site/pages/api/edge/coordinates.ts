import type { NextRequest } from "next/server";
import { RawStatsProps } from "@/lib/stats";
import { redis } from "@/lib/upstash";

export const config = {
  runtime: "experimental-edge",
};

export default async function handler(req: NextRequest) {
  if (req.method === "GET") {
    const numPoints = 50;
    const domain = req.nextUrl.searchParams.get("domain");
    const rawData = await redis.zrange<RawStatsProps[]>(
      domain ? `${domain}:root:clicks` : "dub.sh:clicks:github",
      0,
      numPoints,
      { rev: true },
    );
    const latestCoordinates = rawData.map((data, idx) => {
      const { latitude, longitude } = data.geo;
      return {
        location: [latitude, longitude],
        size: 0.075 - (0.075 / numPoints) * idx,
      };
    });
    return new Response(JSON.stringify(latestCoordinates), { status: 200 });
  } else {
    return new Response(`Method ${req.method} Not Allowed`, { status: 405 });
  }
}
