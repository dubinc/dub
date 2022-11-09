import { NextApiRequest, NextApiResponse } from "next";
import { withUserAuth } from "@/lib/auth";
import { stripe } from "@/lib/stripe";
import { UserProps } from "@/lib/types";

export default withUserAuth(
  async (req: NextApiRequest, res: NextApiResponse, _, user: UserProps) => {
    // POST /api/stripe/manage-subscription – manage a user's subscription
    if (req.method === "POST") {
      const { url } = await stripe.billingPortal.sessions.create({
        customer: user.stripeId,
        return_url: `${
          process.env.VERCEL === "1"
            ? "https://app.dub.sh"
            : "http://app.localhost:3000"
        }/settings`,
      });
      return res.status(200).json(url);
    } else {
      res.setHeader("Allow", ["POST"]);
      return res
        .status(405)
        .json({ error: `Method ${req.method} Not Allowed` });
    }
  },
  { needUserDetails: true },
);
