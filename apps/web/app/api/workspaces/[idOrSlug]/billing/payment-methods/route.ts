import { DubApiError } from "@/lib/api/errors";
import { parseRequestBody } from "@/lib/api/utils";
import { withWorkspace } from "@/lib/auth";
import {
  DIRECT_DEBIT_PAYMENT_METHOD_TYPES,
  DIRECT_DEBIT_PAYMENT_TYPES_INFO,
  PAYMENT_METHOD_TYPES,
} from "@/lib/partners/constants";
import { stripe } from "@/lib/stripe";
import { APP_DOMAIN } from "@dub/utils";
import { NextResponse } from "next/server";
import Stripe from "stripe";
import { z } from "zod";

const addPaymentMethodSchema = z.object({
  method: z.enum(PAYMENT_METHOD_TYPES as [string, ...string[]]).optional(),
});

// GET /api/workspaces/[idOrSlug]/billing/payment-methods - get all payment methods
export const GET = withWorkspace(async ({ workspace }) => {
  if (!workspace.stripeId) {
    return NextResponse.json([]);
  }

  try {
    const paymentMethods = await stripe.paymentMethods.list({
      customer: workspace.stripeId,
    });

    // reorder to put direct debit first
    const directDebit = paymentMethods.data.find((method) =>
      DIRECT_DEBIT_PAYMENT_METHOD_TYPES.includes(method.type),
    );

    return NextResponse.json([
      ...(directDebit ? [directDebit] : []),
      ...paymentMethods.data.filter((method) => method.id !== directDebit?.id),
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

  if (method === "sepa_debit" && workspace.plan !== "enterprise") {
    throw new DubApiError({
      code: "forbidden",
      message: "SEPA Debit is only available on the Enterprise plan.",
    });
  }

  const paymentMethodOption = DIRECT_DEBIT_PAYMENT_TYPES_INFO.find(
    (type) => type.type === method,
  )?.option;

  const { url } = await stripe.checkout.sessions.create({
    mode: "setup",
    customer: workspace.stripeId,
    payment_method_types: [
      method as Stripe.Checkout.SessionCreateParams.PaymentMethodType,
    ],
    payment_method_options: {
      [method]: paymentMethodOption,
    },
    currency: "usd",
    success_url: `${APP_DOMAIN}/${workspace.slug}/settings/billing`,
    cancel_url: `${APP_DOMAIN}/${workspace.slug}/settings/billing`,
  });

  return NextResponse.json({ url });
});
