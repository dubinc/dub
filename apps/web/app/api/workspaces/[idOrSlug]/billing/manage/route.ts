import { DubApiError } from "@/lib/api/errors";
import { withWorkspace } from "@/lib/auth";
import { stripe } from "@/lib/stripe";
import { APP_DOMAIN } from "@dub/utils";
import { NextResponse } from "next/server";

// POST /api/workspaces/[idOrSlug]/billing/manage - create a Stripe billing portal session
export const POST = withWorkspace(async ({ workspace }) => {
  if (!workspace.stripeId) {
    return new Response("No Stripe customer ID", { status: 400 });
  }
  try {
    const { url } = await stripe.billingPortal.sessions.create({
      customer: workspace.stripeId,
      return_url: `${APP_DOMAIN}/${workspace.slug}/settings/billing`,
    });
    return NextResponse.json(url);
  } catch (error) {
    throw new DubApiError({
      code: "bad_request",
      message: error.raw.message,
    });
  }
});
