import type { NextRequest } from "next/server";
import { redis } from "@/lib/upstash";

export const config = {
  runtime: "edge",
};

interface CoordinateProps {
  location: [string, string];
  size: number;
}

export default async function handler(req: NextRequest) {
  if (req.method === "GET") {
    const count = 50;
    let latestCoordinates = [];

    // Check if coordinates are cached in Redis
    const cachedCoordinates = await redis.get<CoordinateProps[]>("coordinates");
    if (cachedCoordinates) {
      latestCoordinates = cachedCoordinates;

      // if not cached in Redis, fetch from Tinybird
    } else if (process.env.TINYBIRD_API_KEY) {
      const response = await fetch(
        `https://api.us-east.tinybird.co/v0/pipes/coordinates.json`,
        {
          headers: {
            Authorization: `Bearer ${process.env.TINYBIRD_API_KEY}`,
          },
        },
      )
        .then((res) => res.json())
        .then((res) => res.data);

      latestCoordinates = response.map(({ latitude, longitude }, idx) => {
        return {
          location: [latitude, longitude],
          size: 0.075 - (0.075 / count) * idx,
        };
      });

      // cache coordinates in Redis for 24 hours
      await redis.set("coordinates", JSON.stringify(latestCoordinates), {
        ex: 86400,
      });
    }

    return new Response(JSON.stringify(latestCoordinates), {
      status: 200,
    });
  } else {
    return new Response(`Method ${req.method} Not Allowed`, { status: 405 });
  }
}
