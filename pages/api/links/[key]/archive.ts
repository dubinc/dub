import { NextApiRequest, NextApiResponse } from "next";
import { archiveLink } from "@/lib/api/links";
import { withUserAuth } from "@/lib/auth";
import prisma from "@/lib/prisma";

const domain = "dub.sh";

export default withUserAuth(
  async (req: NextApiRequest, res: NextApiResponse, userId: string) => {
    const { key } = req.query as { key: string };

    const isOwner = await prisma.link
      .findUnique({
        where: {
          domain_key: {
            domain,
            key,
          },
        },
      })
      .then((link) => link?.userId === userId);

    if (!isOwner) {
      return res.status(403).json({ error: "Not authorized" });
    }

    if (req.method === "PUT") {
      const response = await archiveLink(domain, key);
      return res.status(200).json(response);
    } else {
      res.setHeader("Allow", ["PUT"]);
      return res
        .status(405)
        .json({ error: `Method ${req.method} Not Allowed` });
    }
  },
);
