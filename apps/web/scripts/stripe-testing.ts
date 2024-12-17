// Just for testing

import "dotenv-flow/config";
import { stripe } from "./stripe-init";

async function main() {
  // const customer = await stripe.customers.create({
  //   email: "jackson@dub.co",
  //   metadata: {
  //     dubCustomerId: "jackson@dub.co",
  //   },
  // });

  // console.log(customer);

  // Create checkout session for this customer
  const { url } = await stripe.checkout.sessions.create({
    customer_email: "kiran@example.com",
    success_url: "https://dub.co?session_id={CHECKOUT_SESSION_ID}",
    cancel_url: "https://dub.co",
    line_items: [
      // Recurring
      {
        price: "price_1PE8VYSIvbPMbbGzw4JsqFye",
        quantity: 2,
      },

      // One-time
      // {
      //   price: "price_1PGxy6SIvbPMbbGz8xFJOPkD",
      //   quantity: 2,
      // },
    ],
    // invoice_creation: {
    //   enabled: true,
    // },
    mode: "subscription",
    metadata: {
      dubCustomerId: "kiran",
    },
    // customer_creation: "always",
  });

  console.log(url);
}

main();
