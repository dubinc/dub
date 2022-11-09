import { NextApiRequest, NextApiResponse } from "next";
import { withProjectAuth } from "@/lib/auth";
import { redis } from "@/lib/upstash";

export default withProjectAuth(
  async (req: NextApiRequest, res: NextApiResponse) => {
    const { domain } = req.query as { domain: string };

    // GET /api/projects/[slug]/domains/[domain]/root/clicks - get number of clicks on root domain
    if (req.method === "GET") {
      const clicks =
        domain === "dub.sh"
          ? await redis.get("dub.sh:root:clicks") // we store dub.sh root clicks in a string instead of zset because it has a ton of clicks
          : await redis.zcard(`${domain}:root:clicks`);
      return res.status(200).json(clicks);
    } else {
      res.setHeader("Allow", ["GET"]);
      return res
        .status(405)
        .json({ error: `Method ${req.method} Not Allowed` });
    }
  },
);
