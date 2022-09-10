import { NextApiRequest, NextApiResponse } from "next";
import { getSession } from "@/lib/auth";
import prisma from "@/lib/prisma";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const session = await getSession(req, res);
  if (!session?.user.id) return res.status(401).end("Unauthorized");

  // GET /api/projects – get all projects associated with the authenticated user
  if (req.method === "GET") {
    const response = await prisma.project.findMany({
      where: {
        users: {
          some: {
            userId: session.user.id,
          },
        },
      },
    });
    return res.status(200).json(response);

    // POST /api/projects – create a new project
  } else if (req.method === "POST") {
    const { name, slug } = req.body;
    if (!name || !slug)
      return res.status(400).json({ error: "Missing name or slug" });

    const project = await prisma.project.create({
      data: {
        name,
        slug,
        users: {
          create: {
            userId: session.user.id,
            role: "owner",
          },
        },
      },
    });

    return res.status(200).json(project);
  } else {
    res.setHeader("Allow", ["GET", "POST"]);
    return res.status(405).json({ error: `Method ${req.method} Not Allowed` });
  }
}
