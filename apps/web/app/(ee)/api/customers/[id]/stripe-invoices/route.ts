import { getCustomerOrThrow } from "@/lib/api/customers/get-customer-or-throw";
import { getCustomerStripeInvoices } from "@/lib/api/customers/get-customer-stripe-invoices";
import { DubApiError } from "@/lib/api/errors";
import { getDefaultProgramIdOrThrow } from "@/lib/api/programs/get-default-program-id-or-throw";
import { withWorkspace } from "@/lib/auth";
import { NextResponse } from "next/server";

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

  const stripeCustomerInvoices = await getCustomerStripeInvoices({
    stripeCustomerId: customer.stripeCustomerId,
    stripeConnectId: workspace.stripeConnectId,
    programId: getDefaultProgramIdOrThrow(workspace),
  });

  return NextResponse.json(stripeCustomerInvoices);
});
