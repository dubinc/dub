import { NextApiRequest, NextApiResponse } from "next";
import { getSession } from "@/lib/api/auth";
import prisma from "@/lib/prisma";
import { redis } from "@/lib/redis";
import { LinkProps } from "@/lib/api/types";

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
    const project = await prisma.project.findFirst({
      where: {
        slug,
        users: {
          some: {
            userId: session.user.id,
          },
        },
      },
    });
    if (project) {
      const keys = await redis.zrange<string[]>(
        `${slug}:links:timestamps`,
        0,
        -1,
        {
          rev: true,
        }
      );
      const metadata = (await redis.hmget(`dub.sh:links`, ...keys)) as {
        [key: string]: Omit<LinkProps, "key">;
      };
      const links = keys.map((key) => ({
        key,
        ...metadata[key],
      }));
      return res.status(200).json({
        ...project,
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
