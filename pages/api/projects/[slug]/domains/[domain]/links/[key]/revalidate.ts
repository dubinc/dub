import type { NextApiRequest, NextApiResponse } from "next";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const { domain, key } = req.query as { domain: string; key: string };

  res.setHeader("Access-Control-Allow-Origin", "https://app.dub.sh");
  res.setHeader("Access-Control-Allow-Methods", "PUT");

  try {
    const response = await res.revalidate(`/proxy/${domain}/${key}`);
    res.status(200).json({
      message: "OK",
    });
  } catch (error) {
    res.status(500).json({
      message: `Failed to revalidate "${`/proxy/${domain}/${key}`}"`,
    });
  }
}
