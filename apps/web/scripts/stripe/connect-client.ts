import Stripe from "stripe";

export const stripeConnectClient = new Stripe(
  `${process.env.STRIPE_CONNECT_WRITE_KEY}`,
  {
    apiVersion: "2025-05-28.basil",
    appInfo: {
      name: "Dub.co",
      version: "0.1.0",
    },
  },
);
