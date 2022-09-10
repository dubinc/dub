import { NextApiRequest, NextApiResponse } from "next";
import { redis, editLink } from "@/lib/upstash";
import { getSession } from "@/lib/auth";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const session = await getSession(req, res);
  if (!session?.user.id) return res.status(401).end("Unauthorized");

  if (req.method === "PUT") {
    const { key } = req.query as { key: string };

    const isOwner = await redis.zscore(
      `dub.sh:links:timestamps:${session.user.id}`,
      key
    );

    if (!isOwner) return res.status(401).end("Unauthorized");

    let { key: newKey, url, title, timestamp } = req.body;
    if (!newKey || !url || !title || !timestamp) {
      return res
        .status(400)
        .json({ error: "Missing key or url or title or timestamp" });
    }
    const response = await editLink(
      "dub.sh",
      key,
      newKey,
      url,
      title,
      timestamp,
      session.user.id
    );
    return res.status(200).json(response);
  } else {
    res.setHeader("Allow", ["GET", "POST"]);
    return res.status(405).json({ error: `Method ${req.method} Not Allowed` });
  }
}
