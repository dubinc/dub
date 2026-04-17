import { DubApiError } from "@/lib/api/errors";
import { withWorkspace } from "@/lib/auth";
import { stripe } from "@/lib/stripe";
import { NextResponse } from "next/server";

// POST /api/workspaces/[idOrSlug]/billing/activate-paid-plan — end Stripe billing trial now (charge immediately, subscription becomes active)
export const POST = withWorkspace(
  async ({ workspace }) => {
    if (!workspace.stripeId) {
      return new Response("No Stripe customer ID", { status: 400 });
    }

    try {
      const { data: subscriptions } = await stripe.subscriptions.list({
        customer: workspace.stripeId,
        status: "all",
        limit: 20,
      });

      const trialingSubscription = subscriptions.find(
        (s) => s.status === "trialing",
      );

      if (trialingSubscription) {
        await stripe.subscriptions.update(trialingSubscription.id, {
          trial_end: "now",
        });
        return NextResponse.json({ ok: true });
      }

      const activeSubscription = subscriptions.find(
        (s) => s.status === "active",
      );
      if (activeSubscription) {
        return NextResponse.json({ ok: true });
      }

      throw new DubApiError({
        code: "bad_request",
        message: "No trialing or active subscription found for this workspace.",
      });
    } catch (error) {
      if (error instanceof DubApiError) {
        throw error;
      }
      const stripeErr = error as { raw?: { message?: string } };
      const message =
        stripeErr.raw?.message ??
        (error instanceof Error ? error.message : "Unknown error");
      throw new DubApiError({
        code: "bad_request",
        message,
      });
    }
  },
  {
    requiredPermissions: ["billing.write"],
  },
);
