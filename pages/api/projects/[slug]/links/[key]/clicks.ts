import { NextApiRequest, NextApiResponse } from "next";
import { withProjectAuth } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { getStats } from "@/lib/stats";

export default withProjectAuth(
  async (req: NextApiRequest, res: NextApiResponse) => {
    // GET /api/projects/[slug]/domains/[domain]/links/[key]/clicks - get link clicks
    if (req.method === "GET") {
      const { domain, key, interval } = req.query as {
        domain: string;
        key: string;
        interval?: string;
      };

      if (!interval) {
        // if no interval is provided, get the total clicks from MySQL
        const response = await prisma.link.findUnique({
          where: {
            domain_key: {
              domain,
              key,
            },
          },
          select: {
            clicks: true,
          },
        });
        return res.status(200).json(response?.clicks || 0);
      }

      const response = await getStats({
        domain,
        key,
        endpoint: "clicks",
        interval,
      });

      let clicks = 0;
      try {
        clicks = response[0]["count()"];
      } catch (e) {
        console.log(e);
      }
      return res.status(200).json(clicks);
    } else {
      res.setHeader("Allow", ["GET"]);
      return res
        .status(405)
        .json({ error: `Method ${req.method} Not Allowed` });
    }
  },
);
