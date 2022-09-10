import { NextApiRequest, NextApiResponse } from "next";
import { getRandomKey } from "@/lib/upstash";
import { withProjectAuth } from "@/lib/auth";

export default withProjectAuth(
  async (req: NextApiRequest, res: NextApiResponse) => {
    // POST /api/links – create a new link
    if (req.method === "GET") {
      const { slug } = req.query as { slug: string };
      if (!slug) {
        return res.status(400).json({ error: "Missing hostname" });
      }
      const key = await getRandomKey(slug);
      return res.status(200).json(key);
    } else {
      res.setHeader("Allow", ["GET"]);
      return res
        .status(405)
        .json({ error: `Method ${req.method} Not Allowed` });
    }
  }
);
