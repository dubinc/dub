import { NextApiRequest, NextApiResponse } from "next";
import { withProjectAuth } from "@/lib/auth";
import { removeDomain } from "@/lib/domains";
import prisma from "@/lib/prisma";
import { ProjectProps } from "@/lib/types";
import { deleteProjectLinks } from "@/lib/api/links";
import cloudinary from "cloudinary";

export default withProjectAuth(
  async (req: NextApiRequest, res: NextApiResponse, project: ProjectProps) => {
    const { slug } = req.query;
    if (!slug || typeof slug !== "string") {
      return res
        .status(400)
        .json({ error: "Missing or misconfigured project slug" });
    }
    // GET /api/projects/[slug] – get a specific project
    if (req.method === "GET") {
      return res.status(200).json(project);
      // DELETE /api/projects/[slug] – delete a project
    } else if (req.method === "DELETE") {
      const domain = req.body;
      if (!domain || typeof domain !== "string" || domain !== project.domain) {
        return res
          .status(400)
          .json({ error: "Missing or misconfigured domain" });
      }

      const [
        prismaResponse,
        domainResponse,
        upstashResponse,
        cloudinaryResponse,
      ] = await Promise.all([
        prisma.project.delete({
          where: {
            slug,
          },
        }),
        removeDomain(domain),
        deleteProjectLinks(domain),
        cloudinary.v2.api.delete_resources_by_prefix(domain),
      ]);

      return res.status(200).json({
        prismaResponse,
        domainResponse,
        upstashResponse,
        cloudinaryResponse,
      });
    } else {
      res.setHeader("Allow", ["GET", "DELETE"]);
      return res
        .status(405)
        .json({ error: `Method ${req.method} Not Allowed` });
    }
  },
);
