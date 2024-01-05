import { withAuth } from "@/lib/auth";
import { stripe } from "@/lib/stripe";
import { APP_DOMAIN } from "@dub/utils";
import { NextResponse } from "next/server";

// POST /api/projects/[slug]/billing/manage - create a Stripe billing portal session
export const POST = withAuth(async ({ project }) => {
  if (!project.stripeId) {
    return new Response("No Stripe customer ID", { status: 400 });
  }
  const { url } = await stripe.billingPortal.sessions.create({
    customer: project.stripeId,
    return_url: `${APP_DOMAIN}/${project.slug}/settings/billing`,
  });
  return NextResponse.json(url);
});
