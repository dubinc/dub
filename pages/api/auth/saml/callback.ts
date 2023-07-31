import jackson from "#/lib/jackson";
import { NextApiRequest, NextApiResponse } from "next";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse,
) {
  if (req.method == "POST") {
    const { oauthController } = await jackson();

    const { RelayState, SAMLResponse } = req.body;

    const { redirect_url } = await oauthController.samlResponse({
      RelayState,
      SAMLResponse,
    });

    if (!redirect_url) {
      throw new Error("No redirect URL found.");
    }

    return res.redirect(302, redirect_url);
  } else {
    res.setHeader("Allow", "POST");
    return res.status(405).json({
      error: { message: `Method ${req.method} Not Allowed` },
    });
  }
}
