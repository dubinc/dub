import { NextApiRequest, NextApiResponse } from "next";
import { deleteLink, editLink } from "@/lib/api/links";
import { withUserAuth } from "@/lib/auth";
import prisma from "@/lib/prisma";

const domain = "dub.sh";

export default withUserAuth(
  async (req: NextApiRequest, res: NextApiResponse, userId: string) => {
    const { key: oldKey } = req.query as { key: string };

    const isOwner = await prisma.link
      .findUnique({
        where: {
          domain_key: {
            domain,
            key: oldKey,
          },
        },
      })
      .then((link) => link?.userId === userId);

    if (!isOwner) {
      return res.status(403).json({ error: "Not authorized" });
    }

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
          userId,
        },
        oldKey,
        "dub",
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
);
