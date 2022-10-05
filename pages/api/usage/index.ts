import { NextApiRequest, NextApiResponse } from "next";
import { withUserAuth } from "@/lib/auth";

export default withUserAuth(
  async (req: NextApiRequest, res: NextApiResponse, userId: string) => {
    // GET /api/usage – get a user's usage over all the projects they're an owner of
    if (req.method === "GET") {
      const { settingsPage } = req.query as {
        settingsPage: string;
      };
      const response = await prisma.user.findUnique({
        where: {
          id: userId,
        },
        select: {
          usage: true,
          usageLimit: true,
          ...(settingsPage === "1" && {
            billingCycleStart: true,
            projects: {
              where: {
                role: "owner",
              },
            },
          }),
        },
      });
      return res.status(200).json({
        ...response,
        ...(settingsPage === "1" && {
          projects: undefined,
          projectCount: response?.projects?.length || "0",
        }),
      });
    } else {
      res.setHeader("Allow", ["GET"]);
      return res
        .status(405)
        .json({ error: `Method ${req.method} Not Allowed` });
    }
  }
);
