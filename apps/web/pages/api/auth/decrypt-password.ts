import { NextApiRequest, NextApiResponse } from "next";
import { serialize } from "cookie";
import prisma from "@/lib/prisma";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse,
) {
  if (req.method === "POST") {
    const { domain, key, password } = req.body;
    const { url, password: realPassword } = await prisma.link.findUnique({
      where: { domain_key: { domain, key } },
      select: { url: true, password: true },
    });
    const validPassword = password === realPassword;
    if (validPassword) {
      // Set cookie to authenticate user for 1 week
      res.setHeader(
        "Set-Cookie",
        serialize("dub_authenticated", "1", {
          path: `/${key}`,
          maxAge: 60 * 60 * 24 * 7, // 1 week
          httpOnly: true,
          domain: process.env.NODE_ENV === "production" ? domain : null,
          secure: process.env.NODE_ENV === "production",
        }),
      );
      return res.status(200).json({ url });
    } else {
      return res.status(401).json({ error: "Invalid password" });
    }
  } else {
    res.setHeader("Allow", ["POST"]);
    return res.status(405).json({ error: `Method ${req.method} Not Allowed` });
  }
}
