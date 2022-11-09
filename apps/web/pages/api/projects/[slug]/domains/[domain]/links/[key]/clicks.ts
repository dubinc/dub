import { NextApiRequest, NextApiResponse } from "next";
import { withProjectAuth } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { getLinkClicksCount } from "@/lib/upstash";

export default withProjectAuth(
  async (req: NextApiRequest, res: NextApiResponse) => {
    // GET /api/projects/[slug]/domains/[domain]/links/[key]/clicks - get link clicks
    if (req.method === "GET") {
      const { domain, key } = req.query as { domain: string; key: string };
      const clicks = await getLinkClicksCount(domain, key);
      await prisma.link.update({
        where: {
          domain_key: {
            domain,
            key,
          },
        },
        data: {
          clicks,
          clicksUpdatedAt: new Date(),
        },
      });
      return res.status(200).json(clicks);
    } else {
      res.setHeader("Allow", ["GET"]);
      return res
        .status(405)
        .json({ error: `Method ${req.method} Not Allowed` });
    }
  },
);
