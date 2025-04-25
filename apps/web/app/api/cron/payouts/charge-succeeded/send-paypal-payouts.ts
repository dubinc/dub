import { qstash } from "@/lib/cron";
import { createPaypalToken } from "@/lib/paypal/create-paypal-token";
import { paypalEnv } from "@/lib/paypal/env";
import { prisma } from "@dub/prisma";
import { APP_DOMAIN_WITH_NGROK } from "@dub/utils";
import { Payload, Payouts } from "./utils";

export async function sendPaypalPayouts({
  payload,
  payouts,
}: {
  payload: Payload;
  payouts: Payouts[];
}) {
  if (payouts.length === 0) {
    console.log("No payouts for sending via PayPal, skipping...");
    return;
  }

  const { invoiceId } = payload;
  const paypalAccessToken = await createPaypalToken();

  const body = {
    sender_batch_header: {
      sender_batch_id: invoiceId,
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

  if (!response.ok) {
    console.error("Error creating PayPal batch payout", data);
    console.log("Resetting payout status to pending");

    await prisma.payout.updateMany({
      where: {
        id: {
          in: payouts.map((payout) => payout.id),
        },
      },
      data: {
        status: "pending",
        invoiceId: null,
      },
    });

    // schedule a retry after 24 hours (TBD)
    await qstash.publishJSON({
      url: `${APP_DOMAIN_WITH_NGROK}/api/cron/payouts/charge-succeeded`,
      body: payload,
      delay: 24 * 60 * 60 * 1000,
    });

    throw new Error(data.message);
  }

  console.log("Paypal batch payout created", data);
}
