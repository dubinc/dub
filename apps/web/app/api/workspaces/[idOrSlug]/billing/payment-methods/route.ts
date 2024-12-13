import { withWorkspace } from "@/lib/auth";
import { stripe } from "@/lib/stripe";
import { APP_DOMAIN } from "@dub/utils";
import { NextResponse } from "next/server";

export const GET = withWorkspace(async ({ workspace }) => {
  if (!workspace.stripeId) {
    return NextResponse.json([]);
  }

  try {
    const paymentMethods = await stripe.paymentMethods.list({
      customer: workspace.stripeId,
    });

    return NextResponse.json(paymentMethods.data);
  } catch (error) {
    console.error(error);
    return NextResponse.json([]);
  }
});

export const POST = withWorkspace(async ({ workspace }) => {
  if (!workspace.stripeId) {
    return NextResponse.json({ error: "Workspace does not have a Stripe ID" });
  }

  const { url } = await stripe.billingPortal.sessions.create({
    customer: workspace.stripeId,
    return_url: `${APP_DOMAIN}/${workspace.slug}/settings/billing`,
    flow_data: {
      type: "payment_method_update",
    },
  });

  return NextResponse.json({ url });
});
