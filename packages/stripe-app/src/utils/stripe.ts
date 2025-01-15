import {
  createHttpClient,
  STRIPE_API_KEY,
} from "@stripe/ui-extension-sdk/http_client";
import Stripe from "stripe";

// You don't need an API Key here, because the app uses the
// dashboard credentials to make requests.
export const stripe: Stripe = new Stripe(STRIPE_API_KEY, {
  httpClient: createHttpClient() as Stripe.HttpClient,
  apiVersion: "2023-08-16",
});
