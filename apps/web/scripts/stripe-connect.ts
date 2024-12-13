// Stripe Connect MVP

import "dotenv-flow/config";

import Stripe from "stripe";

export const stripe = new Stripe(`${process.env.STRIPE_SECRET_KEY}`, {
  apiVersion: "2022-11-15",
  appInfo: {
    name: "Dub.co",
    version: "0.1.0",
  },
});

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
