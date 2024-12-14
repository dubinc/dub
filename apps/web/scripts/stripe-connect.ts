// Stripe Connect MVP

import "dotenv-flow/config";
import { stripe } from "./stripe-init";

async function main() {
  // await createExpressAccount();
}

const createExpressAccount = async () => {
  const account = await stripe.accounts.create({
    type: "express",
    business_type: "individual",
    country: "US",
    email: "kiran@dub.co",
    capabilities: {
      transfers: {
        requested: true,
      },
    },
    individual: {
      first_name: "Kiran",
      last_name: "Krishnan",
      email: "kiran@dub.co",
    },
  });

  console.log("Express account created", account);
};

main();
