import { withProjectAuth } from "#/lib/auth";
import { APP_DOMAIN } from "#/lib/constants";
import { stripe } from "#/lib/stripe";

export default withProjectAuth(async (req, res, project) => {
  // POST /api/projects/[slug]/billing/manage – manage a user's subscription
  if (req.method === "POST") {
    const { slug } = req.query as { slug: string };
    if (!project.stripeId) {
      return res.status(400).json({ error: "No Stripe customer ID" });
    }
    const { url } = await stripe.billingPortal.sessions.create({
      customer: project.stripeId,
      return_url: `${APP_DOMAIN}/${slug}/settings/billing`,
    });
    return res.status(200).json(url);
  } else {
    res.setHeader("Allow", ["POST"]);
    return res.status(405).end(`Method ${req.method} Not Allowed`);
  }
});
