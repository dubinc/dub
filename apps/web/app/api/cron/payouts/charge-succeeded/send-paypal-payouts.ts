import { paypalEnv } from "@/lib/paypal/env";
import { prisma } from "@dub/prisma";
import { Partner, Payout, Program } from "@prisma/client";
import { createPaypalToken } from "./create-paypal-token";
import { Payload } from "./utils";

export const dynamic = "force-dynamic";

type PaypalPayout = Payout & {
  partner: Partner;
  program: Program;
};

interface PaypalBatchPayoutResponse {
  batch_header: {
    payout_batch_id: string;
    batch_status: string;
    sender_batch_header: {
      sender_batch_id: string;
    };
  };
}

export async function sendPaypalPayouts({
  invoiceId,
  chargeId,
  receiptUrl,
  achCreditTransfer,
}: Payload) {
  const paypalPayouts = await prisma.payout.findMany({
    where: {
      invoiceId,
      status: {
        not: "completed",
      },
      partner: {
        payoutsEnabledAt: {
          not: null,
        },
        paypalEmail: {
          not: null,
        },
      },
    },
    include: {
      partner: true,
      program: true,
    },
  });

  if (paypalPayouts.length === 0) {
    console.log("No payouts for sending via PayPal, skipping...");
    return;
  }

  const paypalAccessToken = await createPaypalToken();

  const body = {
    sender_batch_header: {
      sender_batch_id: invoiceId,
    },
    items: paypalPayouts.map((payout) => ({
      recipient_type: "EMAIL",
      receiver: payout.partner.paypalEmail,
      note: `Dub Partners payout (${payout.program.name})`,
      amount: {
        value: payout.amount.toString(),
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
    return;
  }

  console.log("Paypal batch payout created", data);
}
