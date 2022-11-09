import { NextApiRequest, NextApiResponse } from "next";
import { checkIfKeyExists } from "@/lib/api/links";
import { withUserAuth } from "@/lib/auth";

// This is a special route to check if a custom dub.sh links exists

export default withUserAuth(
  async (req: NextApiRequest, res: NextApiResponse) => {
    // GET /api/links/[key]/exists - check if a key exists
    if (req.method === "GET") {
      const { key } = req.query as { key: string };
      const response = await checkIfKeyExists("dub.sh", key);
      return res.status(200).json(response);
    } else {
      res.setHeader("Allow", ["GET"]);
      return res
        .status(405)
        .json({ error: `Method ${req.method} Not Allowed` });
    }
  },
);
