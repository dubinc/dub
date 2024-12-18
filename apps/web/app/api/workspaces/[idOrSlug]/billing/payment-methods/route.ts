import { parseRequestBody } from "@/lib/api/utils";
import { withWorkspace } from "@/lib/auth";
import { stripe } from "@/lib/stripe";
import { APP_DOMAIN } from "@dub/utils";
import { NextResponse } from "next/server";
import { z } from "zod";

const addPaymentMethodSchema = z.object({
  method: z.enum(["card", "us_bank_account"]),
});

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

export const POST = withWorkspace(async ({ workspace, req }) => {
  if (!workspace.stripeId) {
    return NextResponse.json({ error: "Workspace does not have a Stripe ID" });
  }

  const { method } = addPaymentMethodSchema.parse(await parseRequestBody(req));

  const { url } = await stripe.checkout.sessions.create({
    mode: "setup",
    customer: workspace.stripeId,
    payment_method_types: [method],
    success_url: `${APP_DOMAIN}/${workspace.slug}/settings/billing`,
    cancel_url: `${APP_DOMAIN}/${workspace.slug}/settings/billing`,
  });

  return NextResponse.json({ url });
});
