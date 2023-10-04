import { NextApiRequest, NextApiResponse } from "next";
import jackson from "#/lib/jackson";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse,
) {
  if (req.method === "GET" || req.method === "POST") {
    const { oauthController } = await jackson();

    const requestParams = req.method === "GET" ? req.query : req.body;

    const { redirect_url, authorize_form } = await oauthController.authorize(
      requestParams,
    );

    if (redirect_url) {
      res.redirect(302, redirect_url);
    } else {
      res.setHeader("Content-Type", "text/html; charset=utf-8");
      res.send(authorize_form);
    }
  } else {
    res.setHeader("Allow", "GET, POST");
    res.status(405).json({
      error: { message: `Method ${req.method} Not Allowed` },
    });
  }
}
