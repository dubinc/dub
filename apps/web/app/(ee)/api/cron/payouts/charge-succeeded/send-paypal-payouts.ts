import { createPayPalBatchPayout } from "@/lib/paypal/create-batch-payout";
import { sendBatchEmail } from "@dub/email";
import PartnerPayoutProcessed from "@dub/email/templates/partner-payout-processed";
import { prisma } from "@dub/prisma";
import { Invoice } from "@dub/prisma/client";

export async function sendPaypalPayouts(invoice: Pick<Invoice, "id">) {
  const payouts = await prisma.payout.findMany({
    where: {
      invoiceId: invoice.id,
      status: "processing",
      mode: "internal",
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
    invoiceId: invoice.id,
  });

  console.log("PayPal batch payout created", batchPayout);

  // update the payouts to "sent" status
  const updatedPayouts = await prisma.payout.updateMany({
    where: {
      id: { in: payouts.map((p) => p.id) },
    },
    data: {
      status: "sent",
      paidAt: new Date(),
    },
  });
  console.log(`Updated ${updatedPayouts.count} payouts to "sent" status`);

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

  console.log("Resend batch emails sent", JSON.stringify(batchEmails, null, 2));
}
