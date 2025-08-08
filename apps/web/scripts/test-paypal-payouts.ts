import { prisma } from "@dub/prisma";
import "dotenv-flow/config";
import { createPaypalToken } from "../lib/paypal/create-paypal-token";
import { paypalEnv } from "../lib/paypal/env";

async function main() {
  const payouts = await prisma.payout.findMany({
    where: {
      id: "po_xxxxx",
    },
    include: {
      partner: true,
      program: true,
    },
  });

  // DON'T FORGET TO CHANGE TO PROD ENVS BEFORE RUNNING THIS SCRIPT
  const paypalAccessToken = await createPaypalToken();

  console.log({ paypalAccessToken });

  console.log("Creating PayPal batch payout with env", paypalEnv);

  const body = {
    sender_batch_header: {
      sender_batch_id: payouts[0].id,
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

  console.log(
    "Creating PayPal batch payout with body",
    JSON.stringify(body, null, 2),
  );

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
