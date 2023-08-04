import jackson from "#/lib/jackson";
import { NextApiRequest, NextApiResponse } from "next";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse,
) {
  const { method } = req;

  try {
    switch (method) {
      case "GET":
      case "POST":
        await handleAuthorize(req, res);
        break;
      default:
        res.setHeader("Allow", "GET, POST");
        res.status(405).json({
          error: { message: `Method ${method} Not Allowed` },
        });
    }
  } catch (err: any) {
    res.status(500).json({ error: { message: err.message } });
  }
}

const handleAuthorize = async (req: NextApiRequest, res: NextApiResponse) => {
  const { oauthController } = await jackson();

  const requestParams = req.method === "GET" ? req.query : req.body;

  const { redirect_url, authorize_form } = await oauthController.authorize(
    requestParams,
  );
  console.log(JSON.stringify({ redirect_url, authorize_form }, null, 2));

  if (redirect_url) {
    res.redirect(302, redirect_url);
  } else {
    res.setHeader("Content-Type", "text/html; charset=utf-8");
    res.send(authorize_form);
  }
};
