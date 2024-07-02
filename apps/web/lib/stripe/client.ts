// Stripe Client SDK
import { Stripe as StripeProps, loadStripe } from "@stripe/stripe-js";

let stripePromise: Promise<StripeProps | null>;

export const getStripe = (stripeAccount?: string) => {
  const publishableKey =
    process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY_LIVE ||
    process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY;

  if (!publishableKey) {
    throw new Error("Stripe publishable key is not set.");
  }

  if (!stripePromise) {
    stripePromise = loadStripe(publishableKey, {
      ...(stripeAccount && { stripeAccount }),
    });
  }

  return stripePromise;
};
