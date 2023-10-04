import { withProjectAuth } from "#/lib/auth";
import { APP_DOMAIN } from "#/lib/constants";
import { stripe } from "#/lib/stripe";

export default withProjectAuth(async (req, res, project, session) => {
  // POST /api/projects/[slug]/billing/upgrade – upgrade a project from free to pro
  if (req.method === "POST") {
    const { slug, priceId } = req.query as { slug: string; priceId: string };

    const stripeSession = await stripe.checkout.sessions.create({
      customer_email: session.user.email,
      billing_address_collection: "required",
      success_url: `${APP_DOMAIN}/${slug}/settings/billing?success=true`,
      cancel_url: `${APP_DOMAIN}/${slug}/settings/billing`,
      line_items: [{ price: priceId, quantity: 1 }],
      automatic_tax: {
        enabled: true,
      },
      tax_id_collection: {
        enabled: true,
      },
      mode: "subscription",
      allow_promotion_codes: true,
      client_reference_id: project.id,
    });
    return res.status(200).json(stripeSession);
  } else {
    res.setHeader("Allow", ["POST"]);
    return res.status(405).end(`Method ${req.method} Not Allowed`);
  }
});
