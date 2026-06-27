import { DubApiError } from "@/lib/api/errors";
import { parseRequestBody } from "@/lib/api/utils";
import { withWorkspace } from "@/lib/auth";
import {
  DIRECT_DEBIT_PAYMENT_METHOD_TYPES,
  DIRECT_DEBIT_PAYMENT_TYPES_INFO,
  PAYMENT_METHOD_TYPES,
} from "@/lib/constants/payouts";
import { stripe } from "@/lib/stripe";
import { APP_DOMAIN } from "@dub/utils";
import { NextResponse } from "next/server";
import Stripe from "stripe";
import * as z from "zod/v4";

const addPaymentMethodSchema = z.object({
  method: z.enum(PAYMENT_METHOD_TYPES as [string, ...string[]]).optional(),
});

const deletePaymentMethodSchema = z.object({
  paymentMethodId: z.string().min(1),
});

const updatePaymentMethodSchema = z.object({
  paymentMethodId: z.string().min(1),
});

async function getWorkspacePaymentMethod({
  stripeId,
  paymentMethodId,
}: {
  stripeId: string;
  paymentMethodId: string;
}) {
  const paymentMethod = await stripe.paymentMethods.retrieve(paymentMethodId);

  if (paymentMethod.customer !== stripeId) {
    throw new DubApiError({
      code: "not_found",
      message: "Payment method not found.",
    });
  }

  return paymentMethod;
}

// GET /api/workspaces/[idOrSlug]/billing/payment-methods - get all payment methods
export const GET = withWorkspace(
  async ({ workspace }) => {
    if (!workspace.stripeId) {
      return NextResponse.json({
        paymentMethods: [],
        defaultPaymentMethodId: null,
      });
    }

    try {
      const [paymentMethods, customer] = await Promise.all([
        stripe.paymentMethods.list({
          customer: workspace.stripeId,
        }),
        stripe.customers.retrieve(workspace.stripeId),
      ]);

      const defaultPaymentMethod =
        customer.deleted !== true
          ? customer.invoice_settings?.default_payment_method
          : null;

      const defaultPaymentMethodId =
        typeof defaultPaymentMethod === "string"
          ? defaultPaymentMethod
          : defaultPaymentMethod?.id ?? null;

      // reorder to put direct debit first
      const directDebit = paymentMethods.data.find((method) =>
        DIRECT_DEBIT_PAYMENT_METHOD_TYPES.includes(method.type),
      );

      return NextResponse.json({
        paymentMethods: [
          ...(directDebit ? [directDebit] : []),
          ...paymentMethods.data.filter(
            (method) => method.id !== directDebit?.id,
          ),
        ],
        defaultPaymentMethodId,
      });
    } catch (error) {
      console.error(error);
      return NextResponse.json({
        paymentMethods: [],
        defaultPaymentMethodId: null,
      });
    }
  },
  {
    requiredPermissions: ["workspaces.read"],
  },
);

// POST /api/workspaces/[idOrSlug]/billing/payment-methods - add a payment method for the workspace
export const POST = withWorkspace(
  async ({ workspace, req }) => {
    if (!workspace.stripeId) {
      throw new DubApiError({
        code: "bad_request",
        message: "Workspace does not have a Stripe ID.",
      });
    }

    const { method } = addPaymentMethodSchema.parse(
      await parseRequestBody(req),
    );

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
  },
  {
    requiredPermissions: ["billing.write"],
  },
);

// PATCH /api/workspaces/[idOrSlug]/billing/payment-methods - set default payment method
export const PATCH = withWorkspace(
  async ({ workspace, req }) => {
    if (!workspace.stripeId) {
      throw new DubApiError({
        code: "bad_request",
        message: "Workspace does not have a Stripe ID.",
      });
    }

    const { paymentMethodId } = updatePaymentMethodSchema.parse(
      await parseRequestBody(req),
    );

    const paymentMethod = await getWorkspacePaymentMethod({
      stripeId: workspace.stripeId,
      paymentMethodId,
    });

    if (DIRECT_DEBIT_PAYMENT_METHOD_TYPES.includes(paymentMethod.type)) {
      throw new DubApiError({
        code: "bad_request",
        message:
          "Direct debit payment methods cannot be set as the default billing method.",
      });
    }

    await stripe.customers.update(workspace.stripeId, {
      invoice_settings: {
        default_payment_method: paymentMethodId,
      },
    });

    return NextResponse.json({ id: paymentMethodId });
  },
  {
    requiredPermissions: ["billing.write"],
  },
);

// DELETE /api/workspaces/[idOrSlug]/billing/payment-methods - remove a payment method
export const DELETE = withWorkspace(
  async ({ workspace, req }) => {
    if (!workspace.stripeId) {
      throw new DubApiError({
        code: "bad_request",
        message: "Workspace does not have a Stripe ID.",
      });
    }

    const { paymentMethodId } = deletePaymentMethodSchema.parse(
      await parseRequestBody(req),
    );

    await getWorkspacePaymentMethod({
      stripeId: workspace.stripeId,
      paymentMethodId,
    });

    await stripe.paymentMethods.detach(paymentMethodId);

    return NextResponse.json({ id: paymentMethodId });
  },
  {
    requiredPermissions: ["billing.write"],
  },
);
