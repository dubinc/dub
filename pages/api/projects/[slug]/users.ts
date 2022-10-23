import { NextApiRequest, NextApiResponse } from "next";
import { withProjectAuth } from "@/lib/auth";
import { removeDomain } from "@/lib/domains";
import prisma from "@/lib/prisma";
import { ProjectProps } from "@/lib/types";
import { deleteProject } from "@/lib/upstash";

export default withProjectAuth(
  async (req: NextApiRequest, res: NextApiResponse, project: ProjectProps) => {
    const { slug } = req.query;
    if (!slug || typeof slug !== "string") {
      return res
        .status(400)
        .json({ error: "Missing or misconfigured project slug" });
    }

    // GET /api/projects/[slug]/users – get users for a specific project
    if (req.method === "GET") {
      const { id: projectId } = project;
      const users = await prisma.user.findMany({
        where: {
          projects: {
            some: {
              projectId,
            },
          },
        },
        select: {
          id: true,
          name: true,
          email: true,
        },
      });
      return res.status(200).json(users);
    } else {
      res.setHeader("Allow", ["GET"]);
      return res
        .status(405)
        .json({ error: `Method ${req.method} Not Allowed` });
    }
  },
);
