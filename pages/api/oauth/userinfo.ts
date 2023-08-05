import type { NextApiRequest, NextApiResponse } from "next";

import jackson from "#/lib/jackson";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse,
) {
  const { oauthController } = await jackson();

  const authHeader = req.headers["authorization"];

  if (!authHeader) {
    throw new Error("Unauthorized");
  }

  const token = authHeader.split(" ")[1];

  const user = await oauthController.userInfo(token);

  return res.json(user);
}
