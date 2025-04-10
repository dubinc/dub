import { Partner, Payout, Program } from "@prisma/client";
import { prisma } from "@dub/prisma";
import { paypalEnv } from "./env";

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

export async function createPaypalBatchPayouts({
  invoiceId,
  payouts,
}: {
  invoiceId: string;
  payouts: PaypalPayout[];
}) {
  // TODO:
  // Fetch the token using the client credentials flow
  const token = "";

  const body = {
    sender_batch_header: {
      sender_batch_id: invoiceId,
    },
    items: payouts.map((payout) => ({
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
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(body),
    },
  );

  const data = await response.json();

  if (!response.ok) {
    console.error(data);
    return;
  }

  const batchPayout = data as PaypalBatchPayoutResponse;

  // await prisma.payout.updateMany({
  //   where: {
  //     id: {
  //       in: payouts.map((payout) => payout.id),
  //     },
  //   },
  //   data: {
  //     paypalBatchId: batchPayout.batch_header.payout_batch_id,
  //     status: "completed",
  //     paidAt: new Date(),
  //   },
  // });

  // await prisma.commission.updateMany({
  //   where: {
  //     payoutId: {
  //       in: payouts.map((payout) => payout.id),
  //     },
  //   },
  //   data: {
  //     status: "paid",
  //   },
  // });

  console.log(data);
}