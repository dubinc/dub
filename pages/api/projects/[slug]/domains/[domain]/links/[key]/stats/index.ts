import { NextApiRequest, NextApiResponse } from "next";
import { withProjectAuth } from "@/lib/auth";
import prisma from "@/lib/prisma";

export default withProjectAuth(
  async (req: NextApiRequest, res: NextApiResponse, project) => {
    const { domain, key } = req.query as {
      domain: string;
      key: string;
    };

    if (domain !== project.domain) {
      return res
        .status(400)
        .json({ error: "Domain does not match project domain" });
    }

    // GET /api/projects/[slug]/domains/[domain]/links/[key]/stats - get a link's stats page privacy
    if (req.method === "GET") {
      const link = await prisma.link.findUnique({
        where: {
          domain_key: {
            domain,
            key,
          },
        },
        select: {
          publicStats: true,
        },
      });

      return res.status(200).json(link);

      // PUT /api/projects/[slug]/domains/[domain]/links/[key]/stats - edit a link's stats page privacy
    } else if (req.method === "PUT") {
      const { publicStats } = req.body as { publicStats: boolean };
      const response = await prisma.link.update({
        where: {
          domain_key: {
            key,
            domain,
          },
        },
        data: {
          publicStats,
        },
      });

      return res.status(200).json(response);
    } else {
      res.setHeader("Allow", ["PUT"]);
      return res
        .status(405)
        .json({ error: `Method ${req.method} Not Allowed` });
    }
  },
  {
    needNotExceededUsage: true,
  },
);
