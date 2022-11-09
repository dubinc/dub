import { NextApiRequest, NextApiResponse } from "next";
import { withProjectAuth } from "@/lib/auth";
import {
  IntervalProps,
  RawStatsProps,
  intervalData,
  processData,
} from "@/lib/stats";
import { redis } from "@/lib/upstash";

export default withProjectAuth(
  async (req: NextApiRequest, res: NextApiResponse) => {
    // GET /api/projects/[slug]/domains/[domain]/links/[key]/stats - get link stats
    if (req.method === "GET") {
      const { domain, key, interval } = req.query as {
        domain: string;
        key: string;
        interval: IntervalProps;
      };
      const start = Date.now() - intervalData[interval || "24h"].milliseconds;
      const end = Date.now();
      const response = await redis.zrange<RawStatsProps[]>(
        `${domain}:clicks:${key}`,
        start,
        end,
        {
          byScore: true,
        },
      );
      const data = await processData(key, response, interval);
      return res.status(200).json(data);
    } else {
      res.setHeader("Allow", ["GET"]);
      return res
        .status(405)
        .json({ error: `Method ${req.method} Not Allowed` });
    }
  },
  { needNotExceededUsage: true },
);
