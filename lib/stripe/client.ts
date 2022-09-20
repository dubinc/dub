// Stripe Client SDK
import { loadStripe, Stripe as StripeProps } from "@stripe/stripe-js";

let stripePromise: Promise<StripeProps | null>;

export const getStripe = () => {
  if (!stripePromise) {
    stripePromise = loadStripe(
      process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY_LIVE ??
        process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY ??
        ""
    );
  }

  return stripePromise;
};
