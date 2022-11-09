import { NextApiRequest, NextApiResponse } from "next";
import { withProjectAuth } from "@/lib/auth";
import { ProjectProps } from "@/lib/types";

export default withProjectAuth(
  async (req: NextApiRequest, res: NextApiResponse, project: ProjectProps) => {
    const { slug } = req.query;
    if (!slug || typeof slug !== "string") {
      return res
        .status(400)
        .json({ error: "Missing or misconfigured project slug" });
    }

    // GET /api/projects/[slug]/usage – get the usage stats specific project (dependent on owner's plan)
    if (req.method === "GET") {
      return res.status(200).json(project);
      // DELETE /api/projects/[slug] – delete a project
    } else {
      res.setHeader("Allow", ["GET"]);
      return res
        .status(405)
        .json({ error: `Method ${req.method} Not Allowed` });
    }
  },
);
