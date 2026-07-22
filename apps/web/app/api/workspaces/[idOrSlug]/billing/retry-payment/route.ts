import { DubApiError } from "@/lib/api/errors";
import { withWorkspace } from "@/lib/auth";
import { stripe } from "@/lib/stripe";
import { NextResponse } from "next/server";
import Stripe from "stripe";

async function getOpenInvoice(stripeId: string) {
  const { data } = await stripe.invoices.list({
    customer: stripeId,
    status: "open",
    limit: 1,
  });

  return data[0] ?? null;
}

async function hasDefaultPaymentMethod({
  stripeId,
  invoice,
}: {
  stripeId: string;
  invoice: Stripe.Invoice;
}) {
  if (invoice.default_payment_method) {
    return true;
  }

  const customer = await stripe.customers.retrieve(stripeId);
  if (customer.deleted) {
    return false;
  }

  return Boolean(customer.invoice_settings?.default_payment_method);
}

function assertStripeCustomer(stripeId: string | null) {
  if (!stripeId) {
    throw new DubApiError({
      code: "bad_request",
      message: "No Stripe customer ID",
    });
  }
}

function handleStripeError(error: unknown): never {
  if (error instanceof DubApiError) {
    throw error;
  }

  throw new DubApiError({
    code: "bad_request",
    message:
      error instanceof Stripe.errors.StripeError
        ? error.message
        : "Failed to retry payment. Please update your payment method and try again.",
  });
}

// GET /api/workspaces/[idOrSlug]/billing/retry-payment — preview open invoice amount due
export const GET = withWorkspace(
  async ({ workspace }) => {
    assertStripeCustomer(workspace.stripeId);

    try {
      const invoice = await getOpenInvoice(workspace.stripeId!);

      if (!invoice?.id) {
        throw new DubApiError({
          code: "not_found",
          message: "No open invoice found to retry.",
        });
      }

      return NextResponse.json({
        invoiceId: invoice.id,
        amountDue: invoice.amount_due,
        currency: invoice.currency,
        hasDefaultPaymentMethod: await hasDefaultPaymentMethod({
          stripeId: workspace.stripeId!,
          invoice,
        }),
      });
    } catch (error) {
      handleStripeError(error);
    }
  },
  {
    requiredPermissions: ["billing.write"],
  },
);

// POST /api/workspaces/[idOrSlug]/billing/retry-payment — pay the latest open invoice
export const POST = withWorkspace(
  async ({ workspace }) => {
    assertStripeCustomer(workspace.stripeId);

    try {
      const invoice = await getOpenInvoice(workspace.stripeId!);

      if (!invoice?.id) {
        throw new DubApiError({
          code: "not_found",
          message: "No open invoice found to retry.",
        });
      }

      if (
        !(await hasDefaultPaymentMethod({
          stripeId: workspace.stripeId!,
          invoice,
        }))
      ) {
        throw new DubApiError({
          code: "bad_request",
          message:
            "No default payment method found. Please add a payment method and try again.",
        });
      }

      const paidInvoice = await stripe.invoices.pay(invoice.id);

      return NextResponse.json({
        invoiceId: paidInvoice.id,
        amountDue: paidInvoice.amount_due,
        amountPaid: paidInvoice.amount_paid,
        currency: paidInvoice.currency,
        status: paidInvoice.status,
      });
    } catch (error) {
      handleStripeError(error);
    }
  },
  {
    requiredPermissions: ["billing.write"],
  },
);
