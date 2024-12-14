import Stripe from "stripe";

export const stripe = new Stripe(`${process.env.STRIPE_SECRET_KEY}`, {
  apiVersion: "2022-11-15",
  appInfo: {
    name: "Dub.co",
    version: "0.1.0",
  },
});
