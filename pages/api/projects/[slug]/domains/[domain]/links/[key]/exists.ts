import { NextApiRequest, NextApiResponse } from "next";

import { withProjectAuth } from "@/lib/auth";
import { checkIfKeyExists } from "@/lib/upstash";

export default withProjectAuth(
  async (req: NextApiRequest, res: NextApiResponse) => {
    if (req.method === "GET") {
      const { domain, key } = req.query as { domain: string; key: string };
      const response = await checkIfKeyExists(domain, key);
      return res.status(200).json(response);
    } else {
      res.setHeader("Allow", ["GET"]);
      return res
        .status(405)
        .json({ error: `Method ${req.method} Not Allowed` });
    }
  }
);
