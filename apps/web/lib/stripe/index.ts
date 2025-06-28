import Stripe from "stripe";

export const stripe = new Stripe(`${process.env.STRIPE_SECRET_KEY}`, {
  apiVersion: "2025-05-28.basil",
  appInfo: {
    name: "Dub.co",
    version: "0.1.0",
  },
});

// Stripe Integration App client
export const stripeAppClient = ({ livemode }: { livemode?: boolean }) =>
  new Stripe(
    `${!livemode ? process.env.STRIPE_APP_SECRET_KEY_TEST : process.env.STRIPE_APP_SECRET_KEY}`,
    {
      apiVersion: "2025-05-28.basil",
      appInfo: {
        name: "Dub.co",
        version: "0.1.0",
      },
    },
  );
