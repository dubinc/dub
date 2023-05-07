import { NextApiRequest, NextApiResponse } from "next";
import prisma from "@/lib/prisma";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse,
) {
  if (req.method === "POST") {
    const { domain, key, password } = req.body;
    const link = await prisma.link.findUnique({
      where: { domain_key: { domain, key } },
      select: { url: true, password: true },
    });
    if (!link) {
      return res.status(404).json({ error: "Link not found" });
    }
    const { url, password: realPassword } = link;
    const validPassword = password === realPassword;
    if (validPassword) {
      return res.status(200).json({ url });
    } else {
      return res.status(401).json({ error: "Invalid password" });
    }
  } else {
    res.setHeader("Allow", ["POST"]);
    return res.status(405).json({ error: `Method ${req.method} Not Allowed` });
  }
}
