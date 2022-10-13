import { NextApiRequest, NextApiResponse } from "next";
import { withUserAuth } from "@/lib/auth";
import { stripe } from "@/lib/stripe";
import { UserProps } from "@/lib/types";

export default withUserAuth(
  async (
    req: NextApiRequest,
    res: NextApiResponse,
    userId: string,
    user: UserProps,
  ) => {
    // POST /api/stripe/upgrade – upgrade a user's account from free to pro
    if (req.method === "POST") {
      const { priceId } = req.query as { priceId: string };
      const session = await stripe.checkout.sessions.create({
        customer_email: user.email,
        payment_method_types: ["card"],
        billing_address_collection: "required",
        success_url: `${
          process.env.VERCEL === "1"
            ? "https://app.dub.sh"
            : "http://app.localhost:3000"
        }/settings`,
        cancel_url: `${
          process.env.VERCEL === "1"
            ? "https://app.dub.sh"
            : "http://app.localhost:3000"
        }/settings`,
        line_items: [{ price: priceId, quantity: 1 }],
        mode: "subscription",
        client_reference_id: userId,
      });
      return res.status(200).json(session);
    } else {
      res.setHeader("Allow", ["POST"]);
      return res
        .status(405)
        .json({ error: `Method ${req.method} Not Allowed` });
    }
  },
  { needUserDetails: true },
);
