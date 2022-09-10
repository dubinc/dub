import { NextApiRequest, NextApiResponse } from "next";
import { withProjectAuth } from "@/lib/api/auth";
import { redis } from "@/lib/upstash";
import { IntervalProps, intervalData, RawStatsProps } from "@/lib/stats";

export default withProjectAuth(
  async (req: NextApiRequest, res: NextApiResponse) => {
    if (req.method === "GET") {
      const { slug, key, interval } = req.query as {
        slug: string;
        key: string;
        interval: IntervalProps;
      };
      const start = Date.now() - intervalData[interval || "7d"].milliseconds;
      const end = Date.now();
      const response = await redis.zrange<RawStatsProps[]>(
        `${slug}:clicks:${key}`,
        start,
        end,
        {
          byScore: true,
        }
      );
      return res.status(200).json(response);
    } else {
      res.setHeader("Allow", ["GET"]);
      return res
        .status(405)
        .json({ error: `Method ${req.method} Not Allowed` });
    }
  }
);
