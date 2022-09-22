import { NextApiRequest, NextApiResponse } from "next";
import { withProjectAuth } from "@/lib/auth";
import { stripe } from "@/lib/stripe";

export default withProjectAuth(
  async (req: NextApiRequest, res: NextApiResponse) => {
    // POST /api/projects/[slug]/upgrade – upgrade a project
    if (req.method === "POST") {
      const { slug } = req.query as { slug: string };
      const session = await stripe.checkout.sessions.create({
        payment_method_types: ["card"],
        billing_address_collection: "required",
        success_url: `${
          process.env.VERCEL === "1"
            ? "https://app.dub.sh"
            : "http://app.localhost:3000"
        }/${slug}/settings`,
        cancel_url: `${
          process.env.VERCEL === "1"
            ? "https://app.dub.sh"
            : "http://app.localhost:3000"
        }/${slug}/settings`,
        line_items: [{ price: process.env.STRIPE_PRO_PRICE_ID, quantity: 1 }],
        mode: "subscription",
        client_reference_id: slug,
      });
      return res.status(200).json(session);
    } else {
      res.setHeader("Allow", ["POST"]);
      return res
        .status(405)
        .json({ error: `Method ${req.method} Not Allowed` });
    }
  }
);
