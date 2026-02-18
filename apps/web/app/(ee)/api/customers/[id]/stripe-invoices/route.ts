import { getCustomerOrThrow } from "@/lib/api/customers/get-customer-or-throw";
import { DubApiError } from "@/lib/api/errors";
import { withWorkspace } from "@/lib/auth";
import { stripeAppClient } from "@/lib/stripe";
import { StripeCustomerInvoiceSchema } from "@/lib/zod/schemas/customers";
import { NextResponse } from "next/server";

const stripe = stripeAppClient({
  ...(process.env.VERCEL_ENV && { mode: "live" }),
});

export const GET = withWorkspace(async ({ workspace, params }) => {
  const { id: customerId } = params;

  if (!workspace.stripeConnectId) {
    throw new DubApiError({
      code: "bad_request",
      message:
        "Your workspace isn't connected to Stripe yet. Please install the Stripe integration under /settings/integrations/stripe to proceed.",
    });
  }

  const customer = await getCustomerOrThrow({
    workspaceId: workspace.id,
    id: customerId,
  });

  if (!customer.stripeCustomerId) {
    throw new DubApiError({
      code: "bad_request",
      message:
        "Customer doesn't have a Stripe customer ID. Please add a Stripe customer ID to the customer before proceeding.",
    });
  }

  const { data } = await stripe.invoices.list(
    {
      customer: customer.stripeCustomerId,
      status: "paid",
    },
    {
      stripeAccount: workspace.stripeConnectId,
    },
  );

  const stripeCustomerInvoices =
    StripeCustomerInvoiceSchema.array().parse(data);

  return NextResponse.json(stripeCustomerInvoices);
});
