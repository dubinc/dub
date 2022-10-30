import { NextApiRequest, NextApiResponse } from "next";
import { Session, withUserAuth } from "@/lib/auth";
import prisma from "@/lib/prisma";

export default withUserAuth(
  async (req: NextApiRequest, res: NextApiResponse, session: Session) => {
    // GET /api/usage – get a user's usage over all the projects they're an owner of
    if (req.method === "GET") {
      const response = await prisma.user.findUnique({
        where: {
          id: session.user.id,
        },
        select: {
          usage: true,
          usageLimit: true,
          billingCycleStart: true,
          projects: {
            where: {
              role: "owner",
            },
          },
        },
      });
      return res.status(200).json({
        ...response,
        projects: undefined,
        projectCount: response?.projects?.length || "0",
      });
    } else {
      res.setHeader("Allow", ["GET"]);
      return res
        .status(405)
        .json({ error: `Method ${req.method} Not Allowed` });
    }
  },
);
