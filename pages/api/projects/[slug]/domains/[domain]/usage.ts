import { NextApiRequest, NextApiResponse } from "next";
import { withProjectAuth } from "@/lib/auth";
import { getUsage } from "@/lib/upstash";
import { ProjectProps } from "@/lib/types";

export default withProjectAuth(
  async (req: NextApiRequest, res: NextApiResponse, project: ProjectProps) => {
    // GET /api/projects/[slug]/domains/[domain]/usage – get project usage
    if (req.method === "GET") {
      const { domain } = req.query as { domain: string };
      const usage = await getUsage(
        domain,
        project.plan !== "free" ? project.lastBilled : null
      );
      return res.status(200).json(usage);
    } else {
      res.setHeader("Allow", ["GET"]);
      return res
        .status(405)
        .json({ error: `Method ${req.method} Not Allowed` });
    }
  }
);
