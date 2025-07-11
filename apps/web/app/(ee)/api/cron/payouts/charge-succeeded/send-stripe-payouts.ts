import {
  BELOW_MIN_WITHDRAWAL_FEE_CENTS,
  MIN_WITHDRAWAL_AMOUNT_CENTS,
} from "@/lib/partners/constants";
import { stripe } from "@/lib/stripe";
import { sendEmail } from "@dub/email";
import PartnerPayoutProcessed from "@dub/email/templates/partner-payout-processed";
import { prisma } from "@dub/prisma";
import { currencyFormatter, pluralize } from "@dub/utils";
import { Invoice } from "@prisma/client";
import { Payload } from "./utils";

export async function sendStripePayouts({
  payload,
  invoice,
}: {
  payload: Payload;
  invoice: Invoice;
}) {
  const { invoiceId } = payload;

  const payouts = await prisma.payout.findMany({
    where: {
      status: {
        in: ["processing", "processed"],
      },
      stripeTransferId: null,
      partner: {
        payoutsEnabledAt: {
          not: null,
        },
        stripeConnectId: {
          not: null,
        },
      },
    },
    include: {
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
    },
  });

  if (payouts.length === 0) {
    console.log("No payouts for sending via Stripe, skipping...");
    return;
  }

  const latestInvoicePayout = payouts.find((p) => p.invoiceId === invoiceId)!;

  // Group payouts by partnerId
  const payoutsByPartner = payouts.reduce((map, payout) => {
    const { partner } = payout;

    if (!map.has(partner.id)) {
      map.set(partner.id, []);
    }

    map.get(partner.id)!.push(payout);

    return map;
  }, new Map<string, typeof payouts>());

  // Process payouts for each partner
  for (const [_, payouts] of payoutsByPartner) {
    let withdrawalFee = 0;
    const partner = payouts[0].partner;
    const payoutIds = payouts.map((p) => p.id);
    const totalAmount = payouts.reduce((acc, payout) => acc + payout.amount, 0);

    // Total payout amount is less than the minimum withdrawal amount
    // we only update status to "processed" – no need to create a transfer for now
    if (totalAmount < partner.minWithdrawalAmount) {
      await prisma.payout.updateMany({
        where: {
          id: {
            in: payoutIds,
          },
        },
        data: {
          status: "processed",
        },
      });

      console.log(
        `Total processed payouts (${currencyFormatter(totalAmount / 100)}) for partner ${partner.id} are below the minWithdrawalAmount (${currencyFormatter(partner.minWithdrawalAmount / 100)}), skipping...`,
      );

      continue;
    }

    // Decide if we need to charge a withdrawal fee for the partner
    if (partner.minWithdrawalAmount < MIN_WITHDRAWAL_AMOUNT_CENTS) {
      withdrawalFee = BELOW_MIN_WITHDRAWAL_FEE_CENTS;
    }

    // Minus the withdrawal fee from the total amount
    const updatedBalance = totalAmount - withdrawalFee;

    if (updatedBalance <= 0) {
      continue;
    }

    // Create a transfer for the partner combined payouts and update it as sent
    const transfer = await stripe.transfers.create(
      {
        amount: updatedBalance,
        currency: "usd",
        transfer_group: invoiceId,
        destination: partner.stripeConnectId!,
        description: `Dub Partners payout for ${payouts.map((p) => p.id).join(", ")}`,
      },
      {
        idempotencyKey: `${invoiceId}-${partner.id}`,
      },
    );

    console.log(
      `Transfer of ${currencyFormatter(totalAmount / 100)} (${transfer.id}) created for partner ${partner.id} for ${pluralize(
        "payout",
        payouts.length,
      )} ${payouts.map((p) => p.id).join(", ")}`,
    );

    await Promise.allSettled([
      prisma.payout.updateMany({
        where: {
          id: {
            in: payoutIds,
          },
        },
        data: {
          stripeTransferId: transfer.id,
          status: "sent",
          paidAt: new Date(),
        },
      }),

      prisma.commission.updateMany({
        where: {
          payoutId: {
            in: payoutIds,
          },
        },
        data: {
          status: "paid",
        },
      }),

      partner.email
        ? sendEmail({
            variant: "notifications",
            subject: "You've been paid!",
            email: partner.email,
            react: PartnerPayoutProcessed({
              email: partner.email,
              program: latestInvoicePayout.program,
              payout: latestInvoicePayout,
            }),
          })
        : Promise.resolve(),
    ]);

    // sleep for 250ms
    await new Promise((resolve) => setTimeout(resolve, 250));
  }
}
