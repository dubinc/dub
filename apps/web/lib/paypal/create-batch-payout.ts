import { createPaypalToken } from "@/lib/paypal/create-paypal-token";
import { paypalEnv } from "@/lib/paypal/env";
import { Partner, Payout, Program } from "@dub/prisma/client";

interface CreatePayPalBatchPayout {
  payouts: (Pick<Payout, "id" | "amount"> & {
    partner: Pick<Partner, "paypalEmail">;
    program: Pick<Program, "name">;
  })[];
  invoiceId: string;
}

// Create a batch payout for an array of payouts for a program
export async function createPayPalBatchPayout({
  payouts,
  invoiceId,
}: CreatePayPalBatchPayout) {
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
    console.error("[PayPal] Batch payout creation failed", data);
    throw new Error(
      `[PayPal] Batch payout creation failed. Invoice ID: ${invoiceId}. Error: ${JSON.stringify(data)}`,
    );
  }

  console.log("[PayPal] Batch payout created", data);

  return data;
}
