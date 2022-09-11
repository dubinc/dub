import { NextApiRequest, NextApiResponse } from "next";
import { redis, editLink } from "@/lib/upstash";
import { withProjectAuth } from "@/lib/auth";

export default withProjectAuth(
  async (req: NextApiRequest, res: NextApiResponse) => {
    if (req.method === "PUT") {
      const { slug } = req.query as { slug: string }; // slug is the domain

      const response = slug;

      return res.status(200).json(response);
    } else {
      res.setHeader("Allow", ["PUT"]);
      return res
        .status(405)
        .json({ error: `Method ${req.method} Not Allowed` });
    }
  }
);
