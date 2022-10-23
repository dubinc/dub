import { NextApiRequest, NextApiResponse } from "next";
import { addLink, getLinksForProject } from "@/lib/api/links";
import { withUserAuth } from "@/lib/auth";

// This is a special route for retrieving and creating custom dub.sh links.

export default withUserAuth(
  async (req: NextApiRequest, res: NextApiResponse, userId: string) => {
    // GET /api/links – get all dub.sh links created by the user
    if (req.method === "GET") {
      const { status, sort } = req.query as {
        status?: string;
        sort?: "createdAt" | "clicks";
      };
      const response = await getLinksForProject({
        domain: "dub.sh",
        status,
        sort,
        userId,
      });
      return res.status(200).json(response);

      // POST /api/links – create a new link
    } else if (req.method === "POST") {
      let { key, url } = req.body;
      if (!key || !url) {
        return res.status(400).json({ error: "Missing key or url" });
      }
      const response = await addLink({
        ...req.body,
        domain: "dub.sh",
        userId,
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
);
