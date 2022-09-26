import { NextApiRequest, NextApiResponse } from "next";
import { getSession } from "@/lib/auth";
import { getUsage } from "@/lib/upstash";
import { ProjectProps } from "@/lib/types";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse,
  project: ProjectProps
) {
  const session = await getSession(req, res);
  if (!session?.user.id) return res.status(401).end("Unauthorized");

  // GET /api/projects/usage – get a user's usage over all their projects
  if (req.method === "GET") {
    const projects = await prisma.project.findMany({
      where: {
        users: {
          some: {
            userId: session.user.id,
          },
        },
      },
    });
    const usage = projects ? await getUsage(session.user.id, projects) : 0;
    return res.status(200).json(usage);
  } else {
    res.setHeader("Allow", ["GET"]);
    return res.status(405).json({ error: `Method ${req.method} Not Allowed` });
  }
}
