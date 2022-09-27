import { NextApiRequest, NextApiResponse } from "next";
import { withProjectAuth } from "@/lib/auth";
import { redis } from "@/lib/upstash";
import {
  IntervalProps,
  intervalData,
  RawStatsProps,
  processData,
} from "@/lib/stats";

export default withProjectAuth(
  async (req: NextApiRequest, res: NextApiResponse) => {
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
        }
      );
      const data = await processData(key, response, interval);
      return res.status(200).json(data);
    } else {
      res.setHeader("Allow", ["GET"]);
      return res
        .status(405)
        .json({ error: `Method ${req.method} Not Allowed` });
    }
  }
);
