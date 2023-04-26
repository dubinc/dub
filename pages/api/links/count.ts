import { NextApiRequest, NextApiResponse } from "next";
import { Session, withUserAuth } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { DUB_PROJECT_ID } from "@/lib/constants";
import { getLinksCount } from "@/lib/api/links";

export default withUserAuth(
  async (req: NextApiRequest, res: NextApiResponse, session: Session) => {
    // GET /api/links/count – get the count for dub.sh links created by the user
    if (req.method === "GET") {
      const count = await getLinksCount({
        req,
        projectId: DUB_PROJECT_ID,
        userId: session.user.id,
      });
      return res.status(200).json(count);
    } else {
      res.setHeader("Allow", ["GET"]);
      return res
        .status(405)
        .json({ error: `Method ${req.method} Not Allowed` });
    }
  },
);
