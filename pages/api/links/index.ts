import { NextApiRequest, NextApiResponse } from "next";
import { redis } from "@/lib/redis";
import { getSession } from "@/lib/api/auth";
import { customAlphabet } from "nanoid";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const session = await getSession(req, res);
  if (!session?.user.id) return res.status(401).end("Unauthorized");

  // GET /api/links – get all dub.sh links created by the user
  if (req.method === "GET") {
    const response = await redis.zrange(
      `dub.sh:timestamps:${session?.user.id}`,
      0,
      -1,
      { rev: true }
    );
    return res.status(200).json(response);

    // POST /api/links – create a new link
  } else if (req.method === "POST") {
    let { hostname, key, url } = req.body;
    if (!hostname || !key || !url) {
      return res.status(400).json({ error: "Missing hostname, key or url" });
    }
    const pipeline = redis.pipeline();
    pipeline.hsetnx(`${hostname}:links`, key, url);
    pipeline.zadd(`dub.sh:timestamps:${session?.user.id}`, {
      score: Date.now(),
      member: key,
    });

    const response = await pipeline.exec();

    if (response === [1, 1]) {
      return res.status(200).json({
        key,
        url,
      });
    } else {
      return res.status(500).json({
        error: "Failed to save link",
      });
    }
  } else {
    res.setHeader("Allow", ["GET", "POST"]);
    return res.status(405).json({ error: `Method ${req.method} Not Allowed` });
  }
}
