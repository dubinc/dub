import type { NextApiRequest, NextApiResponse } from "next";

import jackson from "#/lib/jackson";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse,
) {
  const { oauthController } = await jackson();

  const { RelayState, SAMLResponse } = req.body;

  const { redirect_url } = await oauthController.samlResponse({
    RelayState,
    SAMLResponse,
  });

  return res.redirect(302, redirect_url as string);
}
