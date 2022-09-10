import { NextApiRequest, NextApiResponse } from "next";
import { redis } from "@/lib/upstash";
import { setKey } from "@/lib/api/links";
import { withProjectAuth } from "@/lib/api/auth";

export default withProjectAuth(
  async (req: NextApiRequest, res: NextApiResponse) => {
    // POST /api/links – create a new link
    if (req.method === "POST") {
      let { hostname, key, url } = req.body;
      if (!hostname || !key || !url) {
        return res.status(400).json({ error: "Missing hostname, key or url" });
      }

      const response = await setKey(hostname, key, url);
      if (response === 1) {
        const pipeline = redis.pipeline();
        pipeline.zadd(`${hostname}:links:timestamps`, {
          score: Date.now(),
          member: key,
        });
        pipeline.zadd(`${hostname}:links:clicks`, {
          score: 0,
          member: key,
        });
        return res.status(200).json({
          key,
          url,
        });
      } else {
        return res.status(500).json({
          error: "Failed to save link",
        });
      }
    } else {
      res.setHeader("Allow", ["GET", "POST"]);
      return res
        .status(405)
        .json({ error: `Method ${req.method} Not Allowed` });
    }
  }
);
