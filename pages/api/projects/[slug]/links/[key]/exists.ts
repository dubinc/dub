import { NextApiRequest, NextApiResponse } from "next";
import { checkIfKeyExists } from "@/lib/upstash";
import { withProjectAuth } from "@/lib/auth";

export default withProjectAuth(
  async (req: NextApiRequest, res: NextApiResponse) => {
    if (req.method === "GET") {
      const { key } = req.query as { key: string };
      const response = await checkIfKeyExists("dub.sh", key);
      return res.status(200).json(response);
    } else {
      return res
        .status(405)
        .json({ error: `Method ${req.method} Not Allowed` });
    }
  }
);
