import { NextApiRequest, NextApiResponse } from "next";
import { archiveLink } from "@/lib/api/links";
import { withProjectAuth } from "@/lib/auth";

export default withProjectAuth(
  async (req: NextApiRequest, res: NextApiResponse, project) => {
    const { domain, key } = req.query as {
      domain: string;
      key: string;
    };

    if (domain !== project.domain) {
      return res
        .status(400)
        .json({ error: "Domain does not match project domain" });
    }

    if (req.method === "POST") {
      const response = await archiveLink(domain, key);
      return res.status(200).json(response);
    } else if (req.method === "DELETE") {
      const response = await archiveLink(domain, key, false);
      return res.status(200).json(response);
    } else {
      res.setHeader("Allow", ["POST", "DELETE"]);
      return res
        .status(405)
        .json({ error: `Method ${req.method} Not Allowed` });
    }
  },
);
