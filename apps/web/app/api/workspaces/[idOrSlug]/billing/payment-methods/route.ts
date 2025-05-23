import { DubApiError } from "@/lib/api/errors";
import { parseRequestBody } from "@/lib/api/utils";
import { withWorkspace } from "@/lib/auth";
import { stripe } from "@/lib/stripe";
import { APP_DOMAIN } from "@dub/utils";
import { NextResponse } from "next/server";
import { z } from "zod";

const addPaymentMethodSchema = z.object({
  method: z
    .enum(["card", "us_bank_account", "acss_debit", "sepa_debit"])
    .optional(),
});

const stripePaymentMethodOptions = {
  us_bank_account: {},
  acss_debit: {
    currency: "usd",
    mandate_options: {
      payment_schedule: "sporadic",
      transaction_type: "business",
    },
  },
  sepa_debit: {},
};

// GET /api/workspaces/[idOrSlug]/billing/payment-methods - get all payment methods
export const GET = withWorkspace(async ({ workspace }) => {
  if (!workspace.stripeId) {
    return NextResponse.json([]);
  }

  try {
    const paymentMethods = await stripe.paymentMethods.list({
      customer: workspace.stripeId,
    });

    // reorder to put ACH first
    const ach = paymentMethods.data.find(
      (method) => method.type === "us_bank_account",
    );

    return NextResponse.json([
      ...(ach ? [ach] : []),
      ...paymentMethods.data.filter((method) => method.id !== ach?.id),
    ]);
  } catch (error) {
    console.error(error);
    return NextResponse.json([]);
  }
});

// POST /api/workspaces/[idOrSlug]/billing/payment-methods - add a payment method for the workspace
export const POST = withWorkspace(async ({ workspace, req }) => {
  if (!workspace.stripeId) {
    throw new DubApiError({
      code: "bad_request",
      message: "Workspace does not have a Stripe ID.",
    });
  }

  const { method } = addPaymentMethodSchema.parse(await parseRequestBody(req));

  if (!method) {
    const { url } = await stripe.billingPortal.sessions.create({
      customer: workspace.stripeId,
      return_url: `${APP_DOMAIN}/${workspace.slug}/settings/billing`,
      flow_data: {
        type: "payment_method_update",
      },
    });

    return NextResponse.json({ url });
  }

  const { url } = await stripe.checkout.sessions.create({
    mode: "setup",
    customer: workspace.stripeId,
    payment_method_types: [method],
    payment_method_options: {
      [method]: stripePaymentMethodOptions[method],
    },
    currency: "usd",
    success_url: `${APP_DOMAIN}/${workspace.slug}/settings/billing`,
    cancel_url: `${APP_DOMAIN}/${workspace.slug}/settings/billing`,
  });

  return NextResponse.json({ url });
});
