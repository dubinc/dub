import { DubApiError } from "@/lib/api/errors";
import { withWorkspace } from "@/lib/auth";
import { stripe } from "@/lib/stripe";
import { NextResponse } from "next/server";

// POST /api/workspaces/[idOrSlug]/billing/end-trial — end Stripe subscription trial now (charge immediately)
export const POST = withWorkspace(
  async ({ workspace }) => {
    if (!workspace.stripeId) {
      return new Response("No Stripe customer ID", { status: 400 });
    }

    try {
      const trialingSubscription = await stripe.subscriptions
        .list({
          customer: workspace.stripeId,
          status: "trialing",
          limit: 1,
        })
        .then((res) => res.data[0]);

      if (!trialingSubscription) {
        throw new DubApiError({
          code: "bad_request",
          message: "No trialing subscription found for this workspace.",
        });
      }

      await stripe.subscriptions.update(trialingSubscription.id, {
        trial_end: "now",
      });

      return NextResponse.json({ ok: true });
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
