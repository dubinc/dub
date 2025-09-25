import { createStripeTransfer } from "@/lib/partners/create-stripe-transfer";
import { sendBatchEmail } from "@dub/email";
import PartnerPayoutProcessed from "@dub/email/templates/partner-payout-processed";
import { prisma } from "@dub/prisma";
import { Prisma } from "@prisma/client";

export async function sendStripePayouts({
  invoiceId,
  chargeId,
}: {
  invoiceId: string;
  chargeId: string;
}) {
  const commonInclude = Prisma.validator<Prisma.PayoutInclude>()({
    partner: {
      select: {
        id: true,
        email: true,
        stripeConnectId: true,
        minWithdrawalAmount: true,
      },
    },
    program: {
      select: {
        id: true,
        name: true,
        logo: true,
      },
    },
  });

  const currentInvoicePayouts = await prisma.payout.findMany({
    where: {
      invoiceId,
      status: "processing",
      partner: {
        payoutsEnabledAt: {
          not: null,
        },
        stripeConnectId: {
          not: null,
        },
      },
    },
    include: commonInclude,
  });

  if (currentInvoicePayouts.length === 0) {
    console.log("No payouts to be sent via Stripe, skipping...");
    return;
  }

  // get all previously processed payouts for the partners in this invoice
  // but haven't been transferred to their Stripe Express account yet
  const previouslyProcessedPayouts = await prisma.payout.findMany({
    where: {
      status: "processed",
      stripeTransferId: null,
      partnerId: {
        in: currentInvoicePayouts.map((p) => p.partnerId),
      },
    },
    include: commonInclude,
  });

  // Group currentInvoicePayouts + previouslyProcessedPayouts by partnerId
  const partnerPayoutsMap = [
    ...currentInvoicePayouts,
    ...previouslyProcessedPayouts,
  ].reduce((map, payout) => {
    const { partner } = payout;

    if (!map.has(partner.id)) {
      map.set(partner.id, []);
    }

    map.get(partner.id)!.push(payout);

    return map;
  }, new Map<string, typeof currentInvoicePayouts>());

  // Process payouts for each partner
  for (const [_, partnerPayouts] of partnerPayoutsMap) {
    await createStripeTransfer({
      partner: partnerPayouts[0].partner,
      previouslyProcessedPayouts: partnerPayouts.filter(
        (p) => p.status === "processed",
      ),
      // this is usually just one payout, but we're doing this
      // just in case there are multiple payouts for the same partner in the same invoice
      currentInvoicePayouts: partnerPayouts.filter(
        (p) => p.invoiceId === invoiceId,
      ),
      chargeId,
    });

    // sleep for 250ms
    await new Promise((resolve) => setTimeout(resolve, 250));
  }

  const resendBatch = await sendBatchEmail(
    currentInvoicePayouts
      .filter((p) => p.partner.email)
      .map((p) => ({
        variant: "notifications",
        to: p.partner.email!,
        subject: "You've been paid!",
        react: PartnerPayoutProcessed({
          email: p.partner.email!,
          program: p.program,
          payout: p,
          variant: "stripe",
        }),
      })),
  );

  console.log("Sent Resend batch emails", JSON.stringify(resendBatch, null, 2));
}
