import type { NextRequest } from "next/server";
import { redis } from "@/lib/upstash";
import { RawStatsProps } from "@/lib/stats";

export const config = {
  runtime: "experimental-edge",
};

export default async function handler(req: NextRequest) {
  if (req.method === "GET") {
    const rawData = await redis.zrange<RawStatsProps[]>(
      "dub.sh:clicks:github",
      0,
      30,
      { rev: true }
    );
    const latestCoordinates = rawData.map((data) => {
      const { latitude, longitude } = data.geo;
      return {
        location: [latitude, longitude],
        size: 0.07,
      };
    });
    return new Response(JSON.stringify(latestCoordinates), { status: 200 });
  } else {
    return new Response(`Method ${req.method} Not Allowed`, { status: 405 });
  }
}
