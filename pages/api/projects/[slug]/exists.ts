import { NextApiRequest, NextApiResponse } from "next";
import { getSession } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { RESERVED_KEYS, DEFAULT_REDIRECTS } from "@/lib/constants";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const session = await getSession(req, res);
  if (!session?.user.id) return res.status(401).end("Unauthorized");

  const { slug } = req.query as { slug: string };

  // GET /api/projects/[slug]/exists – check if a project exists
  if (req.method === "GET") {
    if (RESERVED_KEYS.has(slug) || DEFAULT_REDIRECTS[slug]) {
      return res.status(200).json(1);
    }
    const project = await prisma.project.findUnique({
      where: {
        slug,
      },
      select: {
        slug: true,
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
