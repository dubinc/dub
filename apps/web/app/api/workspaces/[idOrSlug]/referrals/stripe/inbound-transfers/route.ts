import { DubApiError } from "@/lib/api/errors";
import { parseRequestBody } from "@/lib/api/utils";
import { withWorkspace } from "@/lib/auth";
import { stripe } from "@/lib/stripe";
import z from "@/lib/zod";
import { NextResponse } from "next/server";

const createInboundTransferSchema = z.object({
  origin_payment_method: z.string(),
  amount: z
    .number()
    .positive()
    .transform((v) => v * 100),
  description: z
    .string()
    .optional()
    .default("Inbound transfer to Financial Account in Dub."),
});

// Create an InboundTransfer
export const POST = withWorkspace(async ({ workspace, req }) => {
  if (!workspace.stripeConnectId || !workspace.stripeFinancialId) {
    throw new DubApiError({
      code: "bad_request",
      message: `[Stripe Treasury] Connect or Financial account not found for workspace ${workspace.id}`,
    });
  }

  const { origin_payment_method, amount, description } =
    createInboundTransferSchema.parse(await parseRequestBody(req));

  // Retrieve the payment method to ensure it belongs to the account
  await stripe.paymentMethods.retrieve(origin_payment_method, {
    stripeAccount: workspace.stripeConnectId,
  });

  const inboundTransfer = await stripe.treasury.inboundTransfers.create(
    {
      financial_account: workspace.stripeFinancialId,
      currency: "usd",
      origin_payment_method,
      amount,
      description,
    },
    {
      stripeAccount: workspace.stripeConnectId,
    },
  );

  console.info(
    `[Stripe Treasury] Inbound transfer ${inboundTransfer.id} has been created for workspace ${workspace.id}`,
  );

  return NextResponse.json(inboundTransfer);
});

// Returns a list of InboundTransfers sent from the specified FinancialAccount.
export const GET = withWorkspace(async ({ workspace, session }) => {
  if (!workspace.stripeConnectId || !workspace.stripeFinancialId) {
    throw new DubApiError({
      code: "bad_request",
      message: `[Stripe Treasury] Connect or Financial account not found for workspace ${workspace.id}`,
    });
  }

  const inboundTransfers = await stripe.treasury.inboundTransfers.list(
    {
      financial_account: workspace.stripeFinancialId,
      limit: 10,
    },
    {
      stripeAccount: workspace.stripeConnectId,
    },
  );

  return NextResponse.json(inboundTransfers.data);
});
