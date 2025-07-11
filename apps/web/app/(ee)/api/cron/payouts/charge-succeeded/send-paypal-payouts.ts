import { createPayPalBatchPayout } from "@/lib/paypal/create-batch-payout";
import { resend } from "@dub/email/resend";
import { VARIANT_TO_FROM_MAP } from "@dub/email/resend/constants";
import PartnerPayoutProcessed from "@dub/email/templates/partner-payout-processed";
import { prisma } from "@dub/prisma";
import { Payload } from "./utils";

export async function sendPaypalPayouts({ payload }: { payload: Payload }) {
  const { invoiceId } = payload;

  const payouts = await prisma.payout.findMany({
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
      partner: {
        select: {
          email: true,
          paypalEmail: true,
        },
      },
      program: {
        select: {
          name: true,
          logo: true,
        },
      },
    },
  });

  if (payouts.length === 0) {
    console.log("No payouts for sending via PayPal, skipping...");
    return;
  }

  const batchPayout = await createPayPalBatchPayout({
    payouts,
    invoiceId,
  });

  console.log("PayPal batch payout created", batchPayout);

  const batchEmails = await resend?.batch.send(
    payouts
      .filter((payout) => payout.partner.email)
      .map((payout) => ({
        from: VARIANT_TO_FROM_MAP.notifications,
        to: payout.partner.email!,
        subject: "You've been paid!",
        react: PartnerPayoutProcessed({
          email: payout.partner.email!,
          program: payout.program,
          payout,
          variant: "paypal",
        }),
      })),
  );

  console.log("Resend batch emails sent", batchEmails);
}
