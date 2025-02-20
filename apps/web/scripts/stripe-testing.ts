// Just for testing

import "dotenv-flow/config";
import { stripe } from "../lib/stripe";

async function main() {
  const session = await stripe.checkout.sessions.create({
    mode: "setup",
    customer: "cus_RPOmxGDnMiVIa3",
    payment_method_types: ["us_bank_account"],
    success_url: "https://example.com/success",
    cancel_url: "https://example.com/cancel",
  });

  console.log("Checkout session created:", session);
}

main();
