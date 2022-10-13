import type { NextApiRequest, NextApiResponse } from "next";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse,
) {
  if (req.query.secret !== process.env.REVALIDATE_TOKEN) {
    return res.status(401).json({ message: "Invalid token" });
  }

  const { domain, key } = req.query as { domain: string; key: string };

  try {
    await res.revalidate(`/proxy/${domain}/${key}`);
    res.status(200).json({
      message: "OK",
    });
  } catch (error) {
    res.status(500).json({
      message: `Failed to revalidate "${`/proxy/${domain}/${key}`}"`,
    });
  }
}
