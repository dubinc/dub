import { addLink, getLinksForProject } from "@/lib/api/links";
import { withProjectAuth } from "@/lib/auth";

export const config = {
  api: {
    bodyParser: {
      sizeLimit: "1500kb",
    },
  },
};

export default withProjectAuth(
  async (req, res, project, session) => {
    // GET /api/projects/[slug]/links - Get all links for a project
    if (req.method === "GET") {
      const { domain, status, tag, search, sort, userId } = req.query as {
        domain?: string;
        status?: string;
        tag?: string;
        search?: string;
        sort?: "createdAt" | "clicks";
        userId?: string;
      };
      const response = await getLinksForProject({
        projectId: project.id,
        domain,
        status,
        tag,
        search,
        sort,
        // @ts-ignore
        userId,
      });
      return res.status(200).json(response);

      // POST /api/projects/[slug]/links – create a new link
    } else if (req.method === "POST") {
      const { domain } = req.query as { domain: string };
      let { key, url } = req.body;
      if (!domain || !key || !url) {
        return res.status(400).json({ error: "Missing domain or url or key" });
      }
      // Prevent the creation of recursive links
      const { hostname, pathname } = new URL(url);
      if (hostname === domain && pathname === `/${key}`) {
        return res.status(400).json({ error: "Invalid url" });
      }

      const response = await addLink({
        ...req.body,
        projectId: project.id,
        userId: session.user.id,
      });
      if (response === null) {
        return res.status(403).json({ error: "Key already exists" });
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
    needNotExceededUsage: true,
  },
);
