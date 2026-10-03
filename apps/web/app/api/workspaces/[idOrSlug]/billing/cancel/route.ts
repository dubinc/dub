import { DubApiError } from "@/lib/api/errors";
import { parseRequestBody } from "@/lib/api/utils";
import { withWorkspace } from "@/lib/auth";
import { stripe } from "@/lib/stripe";
import { cancelSubscriptionSchema } from "@/lib/stripe/cancellation-feedback";
import { NextResponse } from "next/server";
import Stripe from "stripe";
import * as z from "zod/v4";

// POST /api/workspaces/[idOrSlug]/billing/cancel — toggle cancel-at-period-end on the workspace subscription (Stripe API)
export const POST = withWorkspace(
  async ({ workspace, req }) => {
    if (!workspace.stripeId) {
      throw new DubApiError({
        code: "bad_request",
        message: "No Stripe customer ID",
      });
    }

    if (workspace.plan === "enterprise") {
      throw new DubApiError({
        code: "forbidden",
        message:
          "Since you're on an Enterprise plan, billing is managed by your account team. Please reach out to them to manage your subscription.",
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

      const subscriptionAlreadyCancelling =
        subscription.cancel_at_period_end ?? false;

      // If the subscription is already cancelling, we need to resume it
      if (subscriptionAlreadyCancelling) {
        await stripe.subscriptions.update(subscription.id, {
          cancel_at_period_end: false,
        });
      } else {
        const { feedback, comment } = cancelSubscriptionSchema.parse(
          await parseRequestBody(req),
        );

        await stripe.subscriptions.update(subscription.id, {
          cancel_at_period_end: true,
          cancellation_details: {
            comment,
            feedback,
          },
        });
      }

      return NextResponse.json({ success: true });
    } catch (error) {
      if (error instanceof DubApiError || error instanceof z.ZodError) {
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
