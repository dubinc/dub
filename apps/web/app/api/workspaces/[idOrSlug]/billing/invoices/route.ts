import { withWorkspace } from "@/lib/auth";
import { stripe } from "@/lib/stripe";
import { NextResponse } from "next/server";

export const GET = withWorkspace(async ({ workspace }) => {
  if (!workspace.stripeId) {
    return NextResponse.json([]);
  }

  try {
    const invoices = await stripe.invoices.list({
      customer: workspace.stripeId,
    });

    return NextResponse.json(invoices.data);
  } catch (error) {
    console.error(error);
    return NextResponse.json([]);
  }
});
