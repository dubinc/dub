import { NextApiRequest, NextApiResponse } from "next";
import { redis, editLink } from "@/lib/upstash";
import { withProjectAuth } from "@/lib/api/auth";

export default withProjectAuth(
  async (req: NextApiRequest, res: NextApiResponse) => {
    if (req.method === "PUT") {
      const { slug, key } = req.query as { slug: string; key: string };

      let { key: newKey, url, title, timestamp } = req.body;
      if (!newKey || !url || !title || !timestamp) {
        return res
          .status(400)
          .json({ error: "Missing key or url or title or timestamp" });
      }
      const response = await editLink(slug, key, newKey, url, title, timestamp);
      return res.status(200).json(response);
    } else {
      res.setHeader("Allow", ["GET", "POST"]);
      return res
        .status(405)
        .json({ error: `Method ${req.method} Not Allowed` });
    }
  }
);
