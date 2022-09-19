import { NextApiRequest, NextApiResponse } from "next";
import { getSession } from "@/lib/auth";
import prisma from "@/lib/prisma";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const session = await getSession(req, res);
  if (!session?.user.id) return res.status(401).end("Unauthorized");

  const { domain } = req.query as { domain: string };

  // GET /api/projects/dub/domains/[domain]/exists – check if a domain exists (using `dub` as the default project slug)
  if (req.method === "GET") {
    const project = await prisma.project.findUnique({
      where: {
        domain,
      },
      select: {
        domain: true,
      },
    });
    if (project) {
      return res.status(200).json(1);
    } else {
      return res.status(200).json(0);
    }
  } else {
    res.setHeader("Allow", ["GET"]);
    return res.status(405).json({ error: `Method ${req.method} Not Allowed` });
  }
}
