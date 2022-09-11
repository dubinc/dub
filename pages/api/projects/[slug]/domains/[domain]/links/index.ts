import { NextApiRequest, NextApiResponse } from "next";
import { addLink } from "@/lib/upstash";
import { withProjectAuth } from "@/lib/auth";

export default withProjectAuth(
  async (req: NextApiRequest, res: NextApiResponse) => {
    // POST /api/links – create a new link
    if (req.method === "POST") {
      const { domain } = req.query as { domain: string };
      let { key, url, title } = req.body;
      if (!domain || !url) {
        return res.status(400).json({ error: "Missing domain or url" });
      }
      const response = await addLink(domain, url, key, title);
      if (response === null) {
        return res.status(400).json({ error: "Key already exists" });
      }
      return res.status(200).json({ key, url, title });
    } else {
      res.setHeader("Allow", ["POST"]);
      return res
        .status(405)
        .json({ error: `Method ${req.method} Not Allowed` });
    }
  },
  true
);
