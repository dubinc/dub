import { NextApiRequest, NextApiResponse } from "next";
import { withProjectAuth } from "@/lib/auth";
import { ProjectProps } from "@/lib/types";
import prisma from "@/lib/prisma";

export default withProjectAuth(
  async (req: NextApiRequest, res: NextApiResponse, project: ProjectProps) => {
    // GET /api/projects/[slug]/domains – get all domains for a project
    if (req.method === "GET") {
      const domains = await prisma.domain.findMany({
        where: {
          projectId: project.id,
        },
        select: {
          slug: true,
          verified: true,
          primary: true,
        },
      });
      return res.status(200).json(domains);

      // PUT /api/projects/[slug]/domains/[domain]/root - change root domain
    } else {
      res.setHeader("Allow", ["GET", "POST"]);
      return res
        .status(405)
        .json({ error: `Method ${req.method} Not Allowed` });
    }
  },
  {
    excludeGet: true,
    needNotExceededUsage: true,
    needProSubscription: true,
  },
);
