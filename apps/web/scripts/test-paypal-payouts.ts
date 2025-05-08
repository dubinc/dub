import "dotenv-flow/config";
import { createId } from "../lib/api/create-id";
import { createPaypalToken } from "../lib/paypal/create-paypal-token";
import { paypalEnv } from "../lib/paypal/env";

const payouts = [
  {
    id: createId({ prefix: "po_" }),
    partner: {
      paypalEmail: "test@test.com",
    },
    program: {
      name: "Dub",
    },
    amount: 1000,
  },
  {
    id: createId({ prefix: "po_" }),
    partner: {
      paypalEmail: "test@test.com",
    },
    program: {
      name: "Dub",
    },
    amount: 1000,
  },
];

async function main() {
  const paypalAccessToken = await createPaypalToken();
  console.log({ paypalAccessToken });

  console.log("Creating PayPal batch payout with env", paypalEnv);

  const body = {
    sender_batch_header: {
      sender_batch_id: "test_another",
    },
    items: payouts.map((payout) => ({
      recipient_type: "EMAIL",
      receiver: payout.partner.paypalEmail,
      sender_item_id: payout.id,
      note: `Dub Partners payout (${payout.program.name})`,
      amount: {
        value: (payout.amount / 100).toString(),
        currency: "USD",
      },
    })),
  };

  console.log("Creating PayPal batch payout with body", body);

  const response = await fetch(
    `${paypalEnv.PAYPAL_API_HOST}/v1/payments/payouts`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${paypalAccessToken}`,
      },
      body: JSON.stringify(body),
    },
  );

  const data = await response.json();

  console.log("Completed PayPal batch payout with data", data);
}

main();
