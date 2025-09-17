import { createPayPalBatchPayout } from "@/lib/paypal/create-batch-payout";
import { sendBatchEmail } from "@dub/email";
import PartnerPayoutProcessed from "@dub/email/templates/partner-payout-processed";
import { prisma } from "@dub/prisma";

export async function sendPaypalPayouts({ invoiceId }: { invoiceId: string }) {
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

  const batchEmails = await sendBatchEmail(
    payouts
      .filter((payout) => payout.partner.email)
      .map((payout) => ({
        variant: "notifications",
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
