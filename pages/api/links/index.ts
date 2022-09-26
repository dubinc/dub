import { NextApiRequest, NextApiResponse } from "next";
import { getLinksForProject, addLink } from "@/lib/upstash";
import { getSession } from "@/lib/auth";

// This is a special route for creating custom dub.sh links.

<<<<<<< HEAD
export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const session = await getSession(req, res);
  if (!session?.user.id) return res.status(401).end("Unauthorized");

  // GET /api/links – get all dub.sh links created by the user
  if (req.method === "GET") {
    const response = await getLinksForProject("dub.sh", session.user.id);
    return res.status(200).json(response);

    // POST /api/links – create a new link
  } else if (req.method === "POST") {
    let { key, url, title } = req.body;
    if (!url) {
      return res.status(400).json({ error: "Missing url" });
    }
    const response = await addLink(
      "dub.sh",
      { url, key, title },
      session.user.id
    );

    if (response === null) {
      return res.status(400).json({ error: "Key already exists" });
    }
    return res.status(200).json({ key, url, title });
  } else {
    res.setHeader("Allow", ["GET", "POST"]);
    return res.status(405).json({ error: `Method ${req.method} Not Allowed` });
=======
export default async function handler(req: NextRequest) {
  try {
    if (req.method !== "POST") {
      return new Response(`Method ${req.method} Not Allowed`, { status: 405 });
    }

    const url = req.nextUrl.searchParams.get("url");
    const hostname = req.nextUrl.searchParams.get("hostname");
    const nanoid = customAlphabet(
      "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz",
      7,
    ); // 7-character random string

    // 7 characters might cause some collisions, in case of collisions, we retry up to 10 times.
    for (let i = 0; i < 10; i++) {
      const key = nanoid();
      const response = await redis.hsetnx(`${hostname}:links`, key, url);
      if (response === 1) {
        return new Response(
          JSON.stringify({
            key,
            url,
          }),
          { status: 200 },
        );
      }
      console.warn(`Collission: ${key} for ${url}`);
    }
    throw new Error("failed to save link");
  } catch (err) {
    const { message } = (err as Error);
    console.error("Error: ", message);
    return new Response(
      JSON.stringify({
        error: message,
      }),
      { status: 500 },
    );
>>>>>>> origin/id-collission-retry
  }
}
