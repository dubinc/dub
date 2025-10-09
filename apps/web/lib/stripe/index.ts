import Stripe from "stripe";
import { StripeMode } from "../types";

export const stripe = new Stripe(`${process.env.STRIPE_SECRET_KEY}`, {
  apiVersion: "2025-05-28.basil",
  appInfo: {
    name: "Dub.co",
    version: "0.1.0",
  },
});

// Stripe Integration App client
export const stripeAppClient = ({ mode = "live" }: { mode?: StripeMode }) => {
  let appSecretKey: string | undefined;

  if (mode === "test") {
    appSecretKey = process.env.STRIPE_APP_SECRET_KEY_TEST;
  } else if (mode === "sandbox") {
    appSecretKey = process.env.STRIPE_APP_SECRET_KEY_SANDBOX;
  } else {
    appSecretKey = process.env.STRIPE_APP_SECRET_KEY;
  }

  if (!appSecretKey) {
    throw new Error("Stripe app secret key is not set.");
  }

  return new Stripe(appSecretKey, {
    apiVersion: "2025-05-28.basil",
    appInfo: {
      name: "Dub.co",
      version: "0.1.0",
    },
  });
};
