import { NextApiRequest, NextApiResponse } from "next";
import { getRandomKey } from "@/lib/upstash";
import { withProjectAuth } from "@/lib/auth";

export default withProjectAuth(
  async (req: NextApiRequest, res: NextApiResponse) => {
    // POST /api/links – create a new link
    if (req.method === "GET") {
      const { domain } = req.query as { domain: string };
      if (!domain) {
        return res.status(400).json({ error: "Missing hostname" });
      }
      const key = await getRandomKey(domain);
      return res.status(200).json(key);
    } else {
      res.setHeader("Allow", ["GET"]);
      return res
        .status(405)
        .json({ error: `Method ${req.method} Not Allowed` });
    }
  }
);
