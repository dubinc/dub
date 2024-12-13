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

const partner = {
  stripeCustomerId: "cus_RNro3sEDvvLA1h",
};

const affiliate = {
  country: "US",
  firstName: "Affiliate",
  lastName: "Mac",
  email: "affiliate@example.com",
  connectedAccountId: "acct_1PxvAwFZTaDk8h7W",
};

const payout = {
  amount: 1500,
  currency: "usd",
};

async function main() {
  // await createExpressAccount();
  // await createLoginLink();
  // await createPayout();
  await createCustomer();

  // const account = await stripe.accounts.retrieve("acct_1QVHHo2Z0L3O7iWp");

  // console.log("Account", account);
}

const createExpressAccount = async () => {
  const account = await stripe.accounts.create({
    type: "express",
    business_type: "individual",
    country: affiliate.country,
    email: affiliate.email,
    capabilities: {
      transfers: {
        requested: true,
      },
      card_payments: {
        requested: true,
      },
    },
    individual: {
      first_name: affiliate.firstName,
      last_name: affiliate.lastName,
      email: affiliate.email,
    },
  });

  console.log("Created express account for affiliate", account);
};

const createLoginLink = async () => {
  const loginLink = await stripe.accounts.createLoginLink(
    affiliate.connectedAccountId,
  );

  console.log("Login link", loginLink);
};

const createPayout = async () => {
  const result = await stripe.paymentIntents.create({
    amount: payout.amount,
    currency: payout.currency,
    description: "Payout for affiliate from Dub Partners",
    customer: partner.stripeCustomerId, // Partner's Stripe Customer ID
    payment_method: "pm_1QV6ZKFacAXKeDpJQJa2tLc8", // Partner's Stripe Payment Method ID
    confirm: true,
    confirmation_method: "automatic",
    transfer_data: {
      destination: affiliate.connectedAccountId, // To where the payout is sent
    },
    application_fee_amount: 100, // 1% fee from Dub
  });

  console.log("Created payout for affiliate", result);
};

const createCustomer = async () => {
  const customer = await stripe.customers.create({
    email: "kiran@dub.co",
    name: "Kiran Krishnan",
  });

  console.log("Created customer for partner", customer);
};

main();
