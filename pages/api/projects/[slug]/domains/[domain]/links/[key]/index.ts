import { NextApiRequest, NextApiResponse } from "next";
import { deleteLink, editLink } from "@/lib/api/links";
import { withProjectAuth } from "@/lib/auth";

export default withProjectAuth(
  async (req: NextApiRequest, res: NextApiResponse, _, session) => {
    const {
      slug,
      domain,
      key: oldKey,
    } = req.query as {
      slug: string;
      domain: string;
      key: string;
    };

    // PUT /api/projects/[slug]/domains/[domain]/links/[key] - edit a link
    if (req.method === "PUT") {
      let { key, url } = req.body;
      if (!key || !url) {
        return res
          .status(400)
          .json({ error: "Missing key or url or title or timestamp" });
      }
      const response = await editLink(
        {
          domain,
          ...req.body,
          userId: session.user.id,
        },
        oldKey,
        slug,
      );
      if (response === null) {
        return res.status(400).json({ error: "Key already exists" });
      }
      return res.status(200).json(response);
    } else if (req.method === "DELETE") {
      const response = await deleteLink(domain, oldKey);
      return res.status(200).json(response);
    } else {
      res.setHeader("Allow", ["PUT", "DELETE"]);
      return res
        .status(405)
        .json({ error: `Method ${req.method} Not Allowed` });
    }
  },
  {
    needVerifiedDomain: true,
    needNotExceededUsage: true,
  },
);
