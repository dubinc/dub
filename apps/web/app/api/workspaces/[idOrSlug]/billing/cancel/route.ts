import { DubApiError } from "@/lib/api/errors";
import { withWorkspace } from "@/lib/auth";
import { stripe } from "@/lib/stripe";
import { NextResponse } from "next/server";
import Stripe from "stripe";

// POST /api/workspaces/[idOrSlug]/billing/cancel — toggle cancel-at-period-end on the workspace subscription (Stripe API)
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

      const cancelAtPeriodEnd = subscription.cancel_at_period_end ?? false;

      await stripe.subscriptions.update(subscription.id, {
        cancel_at_period_end: !cancelAtPeriodEnd,
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
            : "Failed to update subscription.",
      });
    }
  },
  {
    requiredPermissions: ["billing.write"],
  },
);
