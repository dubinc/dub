import { NextApiRequest, NextApiResponse } from "next";
import { deleteLink, editLink } from "@/lib/api/links";
import { withProjectAuth } from "@/lib/auth";

export const config = {
  api: {
    bodyParser: {
      sizeLimit: "1500kb",
    },
  },
};

export default withProjectAuth(
  async (req: NextApiRequest, res: NextApiResponse, project) => {
    const { domain, key: oldKey } = req.query as {
      domain: string;
      key: string;
    };

    if (domain !== project.domain) {
      return res
        .status(400)
        .json({ error: "Domain does not match project domain" });
    }

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
        },
        oldKey,
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
    needNotExceededUsage: true,
  },
);
