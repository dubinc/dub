import { NextApiRequest, NextApiResponse } from "next";
import { getSession } from "@/lib/api/auth";
import { redis } from "@/lib/redis";
import prisma from "@/lib/prisma";
import { IntervalProps, intervalData, RawStatsProps } from "@/lib/stats";

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

  const isProjectOwner = await prisma.project.count({
    where: {
      slug,
      users: {
        some: {
          userId: session.user.id,
        },
      },
    },
  });
  if (!isProjectOwner) return res.status(401).end("Unauthorized");

  if (req.method === "GET") {
    const { slug, key, interval } = req.query as {
      slug: string;
      key: string;
      interval: IntervalProps;
    };
    const start = Date.now() - intervalData[interval || "7d"].milliseconds;
    const end = Date.now();
    const response = await redis.zrange<RawStatsProps[]>(
      `${slug}:${key}:clicks`,
      start,
      end,
      {
        byScore: true,
      }
    );
    return res.status(200).json(response);
  } else {
    res.setHeader("Allow", ["GET"]);
    return res.status(405).json({ error: `Method ${req.method} Not Allowed` });
  }
}
