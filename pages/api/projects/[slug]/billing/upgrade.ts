import { withProjectAuth } from "@/lib/auth";
import { stripe } from "@/lib/stripe";

export default withProjectAuth(async (req, res, project, session) => {
  // POST /api/projects/[slug]/billing/upgrade – upgrade a project from free to pro
  if (req.method === "POST") {
    const { slug, priceId } = req.query as { slug: string; priceId: string };

    const stripeSession = await stripe.checkout.sessions.create({
      customer_email: session.user.email,
      payment_method_types: ["card"],
      billing_address_collection: "required",
      success_url: `${
        process.env.VERCEL === "1"
          ? "https://app.dub.sh"
          : "http://app.localhost:3000"
      }/${slug}/settings/billing?success=true`,
      cancel_url: `${
        process.env.VERCEL === "1"
          ? "https://app.dub.sh"
          : "http://app.localhost:3000"
      }/${slug}/settings/billing`,
      line_items: [{ price: priceId, quantity: 1 }],
      automatic_tax: {
        enabled: true,
      },
      tax_id_collection: {
        enabled: true,
      },
      mode: "subscription",
      client_reference_id: project.id,
    });
    return res.status(200).json(stripeSession);
  } else {
    res.setHeader("Allow", ["POST"]);
    return res.status(405).json({ error: `Method ${req.method} Not Allowed` });
  }
});
