import {
  BELOW_MIN_WITHDRAWAL_FEE_CENTS,
  MIN_WITHDRAWAL_AMOUNT_CENTS,
} from "@/lib/partners/constants";
import { stripe } from "@/lib/stripe";
import { sendEmail } from "@dub/email";
import PartnerPayoutSent from "@dub/email/templates/partner-payout-sent";
import { prisma } from "@dub/prisma";
import { currencyFormatter } from "@dub/utils";
import { Payload } from "./utils";

export async function sendStripePayouts({ payload }: { payload: Payload }) {
  const { invoiceId, chargeId, achCreditTransfer } = payload;

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
    select: {
      id: true,
      amount: true,
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

    // Total payout amount is less than the minimum withdrawal amount, we don't need to them
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
        `Payouts amount (${currencyFormatter(totalAmount / 100)}) for partner ${partner.id} are below the minWithdrawalAmount (${currencyFormatter(partner.minWithdrawalAmount / 100)})`,
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
        description: "You’ve been paid!",
      },
      {
        idempotencyKey: `${invoiceId}-${partner.id}`,
      },
    );

    console.log(
      `Transfer ${transfer.id} created for payout amount of ${totalAmount} for partner ${partner.id}`,
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
            react: PartnerPayoutSent({
              email: partner.email,
              payoutAmount: totalAmount,
            }),
          })
        : Promise.resolve(),
    ]);

    // sleep for 250ms
    await new Promise((resolve) => setTimeout(resolve, 250));
  }
}
