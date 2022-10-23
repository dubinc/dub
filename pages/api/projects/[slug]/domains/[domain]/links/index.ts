import { NextApiRequest, NextApiResponse } from "next";
import { addLink, getLinksForProject } from "@/lib/api/links";
import { withProjectAuth } from "@/lib/auth";

export default withProjectAuth(
  async (req: NextApiRequest, res: NextApiResponse, _, session) => {
    // GET /api/projects/[slug]/domains/[domain]/links - Get all links for a project
    if (req.method === "GET") {
      const { domain, status, sort, userId } = req.query as {
        domain: string;
        status?: string;
        sort?: "createdAt" | "clicks";
        userId?: string;
      };
      const response = await getLinksForProject({
        domain,
        status,
        sort,
        userId,
      });
      return res.status(200).json(response);

      // POST /api/projects/[slug]/domains/[domain]/links – create a new link
    } else if (req.method === "POST") {
      const { domain } = req.query as { domain: string };
      let { key, url } = req.body;
      if (!domain || !key || !url) {
        return res.status(400).json({ error: "Missing domain or url or key" });
      }
      const response = await addLink({
        ...req.body,
        userId: session.user.id,
      });
      if (response === null) {
        return res.status(400).json({ error: "Key already exists" });
      }
      return res.status(200).json(response);
    } else {
      res.setHeader("Allow", ["GET", "POST"]);
      return res
        .status(405)
        .json({ error: `Method ${req.method} Not Allowed` });
    }
  },
  {
    excludeGet: true,
    needVerifiedDomain: true,
    needNotExceededUsage: true,
  },
);
