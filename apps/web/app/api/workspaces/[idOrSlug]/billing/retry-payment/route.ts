import { DubApiError } from "@/lib/api/errors";
import { parseRequestBody } from "@/lib/api/utils";
import { withWorkspace } from "@/lib/auth";
import { stripe } from "@/lib/stripe";
import { NextResponse } from "next/server";
import Stripe from "stripe";
import * as z from "zod/v4";

const retryPaymentSchema = z.object({
  invoiceId: z.string().startsWith("in_"),
});

// POST /api/workspaces/[idOrSlug]/billing/retry-payment — pay a specific open invoice
export const POST = withWorkspace(
  async ({ workspace, req }) => {
    if (!workspace.stripeId) {
      throw new DubApiError({
        code: "not_found",
        message: "No Stripe customer ID",
      });
    }

    try {
      const { invoiceId } = retryPaymentSchema.parse(
        await parseRequestBody(req),
      );

      const invoice = await stripe.invoices.retrieve(invoiceId);

      if (!invoice || invoice.customer !== workspace.stripeId) {
        throw new DubApiError({
          code: "not_found",
          message: "Invoice not found",
        });
      }

      if (invoice.status !== "open") {
        throw new DubApiError({
          code: "bad_request",
          message: "Invoice is not open and cannot be retried.",
        });
      }

      const paidInvoice = await stripe.invoices.pay(invoiceId);

      if (paidInvoice.status !== "paid") {
        throw new DubApiError({
          code: "bad_request",
          message:
            "Payment could not be completed. Please update your payment method and try again.",
        });
      }

      return NextResponse.json({
        invoiceId: paidInvoice.id,
        amountDue: paidInvoice.amount_due,
        amountPaid: paidInvoice.amount_paid,
        currency: paidInvoice.currency,
        status: paidInvoice.status,
      });
    } catch (error) {
      if (error instanceof DubApiError || error instanceof z.ZodError) {
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
  },
  {
    requiredPermissions: ["billing.write"],
  },
);
