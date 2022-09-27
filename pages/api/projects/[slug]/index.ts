import { NextApiRequest, NextApiResponse } from "next";
import { withProjectAuth } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { removeDomain } from "@/lib/domains";
import { deleteProject } from "@/lib/upstash";
import { ProjectProps } from "@/lib/types";

export default withProjectAuth(
  async (req: NextApiRequest, res: NextApiResponse, project: ProjectProps) => {
    const { slug } = req.query;
    if (!slug || typeof slug !== "string") {
      return res
        .status(400)
        .json({ error: "Missing or misconfigured project slug" });
    }

    // GET /api/projects/[slug] – get a specific project with it's links
    if (req.method === "GET") {
      return res.status(200).json(project);
      // DELETE /api/projects/[slug] – edit a project
    } else if (req.method === "DELETE") {
      const domain = req.body;
      if (!domain || typeof domain !== "string") {
        return res
          .status(400)
          .json({ error: "Missing or misconfigured domain" });
      }

      const [prismaResponse, domainResponse, upstashResponse] =
        await Promise.all([
          prisma.project.delete({
            where: {
              slug,
            },
          }),
          removeDomain(domain),
          deleteProject(domain),
        ]);

      return res
        .status(200)
        .json({ prismaResponse, domainResponse, upstashResponse });
    } else {
      res.setHeader("Allow", ["GET", "DELETE"]);
      return res
        .status(405)
        .json({ error: `Method ${req.method} Not Allowed` });
    }
  }
);
