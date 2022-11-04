import { NextApiRequest, NextApiResponse } from "next";
import { archiveLink } from "@/lib/api/links";
import { Session, withUserAuth } from "@/lib/auth";
import prisma from "@/lib/prisma";

const domain = "dub.sh";

export default withUserAuth(
  async (req: NextApiRequest, res: NextApiResponse, session: Session) => {
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
      .then((link) => link?.userId === session.user.id);

    if (!isOwner) {
      return res.status(403).json({ error: "Not authorized" });
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
