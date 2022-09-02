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

const mock = [
  {
    geo: {
      city: "San Francisco",
      region: "CA",
      country: "US",
      latitude: "37.7695",
      longitude: "-122.385",
    },
    ua: {
      ua: "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/104.0.0.0 Safari/537.36",
      browser: {},
      engine: {},
      os: {},
      device: {},
      cpu: {},
      isBot: false,
    },
    timestamp: 1661737363508,
  },
  {
    geo: {
      city: "San Francisco",
      region: "CA",
      country: "US",
      latitude: "37.7695",
      longitude: "-122.385",
    },
    ua: {
      ua: "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/104.0.0.0 Safari/537.36",
      browser: {},
      engine: {},
      os: {},
      device: {},
      cpu: {},
      isBot: false,
    },
    timestamp: 1661737363608,
  },
  {
    geo: {
      city: "San Francisco",
      region: "CA",
      country: "US",
      latitude: "37.7695",
      longitude: "-122.385",
    },
    ua: {
      ua: "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/104.0.0.0 Safari/537.36",
      browser: {},
      engine: {},
      os: {},
      device: {},
      cpu: {},
      isBot: false,
    },
    timestamp: 1661737363908,
  },
  {
    geo: {
      city: "Dallas",
      country: "US",
      latitude: "32.7889",
      longitude: "-96.8021",
      region: "TX",
    },
    ua: {
      ua: "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/104.0.0.0 Safari/537.36",
      browser: {},
      engine: {},
      os: {},
      device: {},
      cpu: {},
      isBot: false,
    },
    timestamp: 1661757572391,
  },
  {
    geo: {
      city: "Dallas",
      country: "US",
      latitude: "32.7889",
      longitude: "-96.8021",
      region: "TX",
    },
    ua: {
      ua: "curl/7.77.0",
      browser: {},
      engine: {},
      os: {},
      device: {},
      cpu: {},
      isBot: false,
    },
    timestamp: 1661757801308,
  },
  {
    geo: {
      city: "Dallas",
      country: "US",
      latitude: "32.7889",
      longitude: "-96.8021",
      region: "TX",
    },
    ua: {
      ua: "curl/7.77.0",
      browser: {},
      engine: {},
      os: {},
      device: {},
      cpu: {},
      isBot: false,
    },
    timestamp: 1661757805125,
  },
  {
    geo: {
      city: "Dallas",
      country: "US",
      latitude: "32.7889",
      longitude: "-96.8021",
      region: "TX",
    },
    ua: {
      ua: "curl/7.77.0",
      browser: {},
      engine: {},
      os: {},
      device: {},
      cpu: {},
      isBot: false,
    },
    timestamp: 1661757810830,
  },
  {
    geo: {
      city: "Dallas",
      country: "US",
      latitude: "32.7889",
      longitude: "-96.8021",
      region: "TX",
    },
    ua: {
      ua: "curl/7.77.0",
      browser: {},
      engine: {},
      os: {},
      device: {},
      cpu: {},
      isBot: false,
    },
    timestamp: 1661871209000,
  },
  {
    geo: {
      city: "Dallas",
      country: "US",
      latitude: "32.7889",
      longitude: "-96.8021",
      region: "TX",
    },
    ua: {
      ua: "curl/7.77.0",
      browser: {},
      engine: {},
      os: {},
      device: {},
      cpu: {},
      isBot: false,
    },
    timestamp: 1661871210000,
  },
];
