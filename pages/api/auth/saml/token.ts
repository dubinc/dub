import type { NextApiRequest, NextApiResponse } from "next";

import jackson from "#/lib/jackson";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse,
) {
  const { oauthController } = await jackson();

  const response = await oauthController.token(req.body);

  return res.json(response);
}
