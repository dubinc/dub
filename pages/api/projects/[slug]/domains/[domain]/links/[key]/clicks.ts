import { NextApiRequest, NextApiResponse } from "next";
import { withProjectAuth } from "@/lib/auth";
import { redis } from "@/lib/upstash";

export default withProjectAuth(
  async (req: NextApiRequest, res: NextApiResponse) => {
    if (req.method === "GET") {
      const { domain, key } = req.query;
      const response = (await redis.zcard(`${domain}:clicks:${key}`)) || "0";
      return res.status(200).json(response);
    } else {
      res.setHeader("Allow", ["GET"]);
      return res
        .status(405)
        .json({ error: `Method ${req.method} Not Allowed` });
    }
  }
);
