import { NextApiRequest, NextApiResponse } from "next";
import { withProjectAuth } from "@/lib/auth";
import { redis } from "@/lib/upstash";

export default withProjectAuth(
  async (req: NextApiRequest, res: NextApiResponse) => {
    // GET /api/projects/[slug]/exists – check if a project exists
    if (req.method === "GET") {
      const { domain } = req.query as { domain: string };

      const clicks = await redis.zrange(`${domain}:links:clicks`, 0, -1, {
        withScores: true,
      });
      const totalClicks = (
        clicks.filter((_, i) => i % 2 === 1) as number[]
      ).reduce((a, b) => a + b, 0);
      return res.status(200).json({ totalClicks });
    } else {
      res.setHeader("Allow", ["GET"]);
      return res
        .status(405)
        .json({ error: `Method ${req.method} Not Allowed` });
    }
  }
);
