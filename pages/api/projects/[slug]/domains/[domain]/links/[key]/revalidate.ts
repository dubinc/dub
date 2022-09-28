import type { NextApiRequest, NextApiResponse } from "next";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  console.log("first received request", req.headers.host);

  if (req.query.secret !== process.env.REVALIDATE_TOKEN) {
    return res.status(401).json({ message: "Invalid token" });
  }
  console.log("valid secret", req.headers.host);

  const { domain, key } = req.query as { domain: string; key: string };

  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "PUT");
  console.log("passed CORS", domain, key, req.headers.host);

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
