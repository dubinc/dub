import { NextApiRequest, NextApiResponse } from "next";
import { withUserAuth } from "@/lib/auth";
import prisma from "@/lib/prisma";

export default withUserAuth(
  async (req: NextApiRequest, res: NextApiResponse) => {
    const { domain } = req.query as { domain: string };

    // GET /api/projects/[slug]/domains/[domain]/exists – check if a domain exists
    if (req.method === "GET") {
      const project = await prisma.domain.findUnique({
        where: {
          slug: domain,
        },
        select: {
          slug: true,
        },
      });
      if (project) {
        return res.status(200).json(1);
      } else {
        return res.status(200).json(0);
      }
    } else {
      res.setHeader("Allow", ["GET"]);
      return res
        .status(405)
        .json({ error: `Method ${req.method} Not Allowed` });
    }
  },
);
