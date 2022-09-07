import { NextApiRequest, NextApiResponse } from "next";
import { getSession } from "@/lib/api/auth";
import prisma from "@/lib/prisma";
import { redis } from "@/lib/redis";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const session = await getSession(req, res);
  if (!session?.user.id) return res.status(401).end("Unauthorized");

  const { slug } = req.query;
  if (!slug || typeof slug !== "string") {
    return res
      .status(400)
      .json({ error: "Missing or misconfigured project slug" });
  }

  // GET /api/projects/[slug] – get a specific project with it's links
  if (req.method === "GET") {
    const response = await prisma.project.findFirst({
      where: {
        slug,
        users: {
          some: {
            userId: session.user.id,
          },
        },
      },
    });
    if (response) {
      const keys = await redis.zrange<string[]>(
        `${slug}:links:timestamps`,
        0,
        -1,
        {
          rev: true,
        }
      );
      const urls =
        keys.length > 0 ? await redis.hmget(`${slug}:links`, ...keys) : {};
      const links = Object.entries(urls || {}).map(([key, value]) => ({
        key,
        url: value,
      }));
      return res.status(200).json({
        ...response,
        links,
      });
    } else {
      return res.status(404).json({ error: "Project not found" });
    }

    // PUT /api/projects/[slug] – edit a project
  } else if (req.method === "PUT") {
    return res.status(200).send("TODO");
  } else {
    res.setHeader("Allow", ["GET", "PUT"]);
    return res.status(405).json({ error: `Method ${req.method} Not Allowed` });
  }
}
