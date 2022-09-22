import type { NextRequest } from "next/server";
import { redis } from "@/lib/upstash";
import { RawStatsProps } from "@/lib/stats";

export const config = {
  runtime: "experimental-edge",
};

export default async function handler(req: NextRequest) {
  if (req.method === "GET") {
    const numPoints = 30;
    const hostname = req.nextUrl.searchParams.get("hostname");
    const rawData = await redis.zrange<RawStatsProps[]>(
      hostname ? `${hostname}:root:clicks` : "dub.sh:clicks:github",
      0,
      numPoints,
      { rev: true }
    );
    const latestCoordinates = rawData.map((data, idx) => {
      const { latitude, longitude } = data.geo;
      return {
        location: [latitude, longitude],
        size: 0.1 - (0.1 / numPoints) * idx,
      };
    });
    return new Response(JSON.stringify(latestCoordinates), { status: 200 });
  } else {
    return new Response(`Method ${req.method} Not Allowed`, { status: 405 });
  }
}
