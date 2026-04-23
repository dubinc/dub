import { DubApiError } from "@/lib/api/errors";
import { withWorkspace } from "@/lib/auth";
import { stripe } from "@/lib/stripe";
import { NextResponse } from "next/server";
import Stripe from "stripe";

// POST /api/workspaces/[idOrSlug]/billing/cancel — schedule subscription cancellation at period end (Stripe API)
export const POST = withWorkspace(
  async ({ workspace }) => {
    if (!workspace.stripeId) {
      throw new DubApiError({
        code: "bad_request",
        message: "No Stripe customer ID",
      });
    }

    try {
      const { data } = await stripe.subscriptions.list({
        customer: workspace.stripeId,
        limit: 10,
      });
      const subscription = data.find(
        (s) => s.status === "active" || s.status === "trialing",
      );
      if (!subscription) {
        throw new DubApiError({
          code: "not_found",
          message: "No active or trialing subscription found.",
        });
      }

      await stripe.subscriptions.update(subscription.id, {
        cancel_at_period_end: true,
      });

      return NextResponse.json({ success: true });
    } catch (error) {
      if (error instanceof DubApiError) {
        throw error;
      }
      throw new DubApiError({
        code: "bad_request",
        message:
          error instanceof Stripe.errors.StripeError
            ? error.message
            : "Failed to cancel subscription.",
      });
    }
  },
  {
    requiredPermissions: ["billing.write"],
  },
);
