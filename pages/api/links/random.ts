import { NextApiRequest, NextApiResponse } from "next";
import { getRandomKey } from "@/lib/api/links";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse,
) {
  if (req.method === "GET") {
    const response = await getRandomKey("dub.sh");
    console.log(response);
    return res.status(200).json(response);
  } else {
    res.setHeader("Allow", ["GET"]);
    return res.status(405).json({ error: `Method ${req.method} Not Allowed` });
  }
}
