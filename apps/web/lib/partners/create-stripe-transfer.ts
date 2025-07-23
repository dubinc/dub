import { stripe } from "@/lib/stripe";
import { prisma } from "@dub/prisma";
import { Partner, Payout } from "@dub/prisma/client";
import { currencyFormatter, pluralize } from "@dub/utils";
import {
  BELOW_MIN_WITHDRAWAL_FEE_CENTS,
  MIN_WITHDRAWAL_AMOUNT_CENTS,
} from "./constants";

export const createStripeTransfer = async ({
  partner,
  previouslyProcessedPayouts,
  currentInvoicePayouts,
}: {
  partner: Pick<Partner, "id" | "minWithdrawalAmount" | "stripeConnectId">;
  previouslyProcessedPayouts: Pick<Payout, "id" | "amount" | "invoiceId">[];
  currentInvoicePayouts?: Pick<Payout, "id" | "amount" | "invoiceId">[];
}) => {
  // this should never happen since we guard for it outside, but just in case
  if (!partner.stripeConnectId) {
    console.log(`Partner ${partner.id} has no stripeConnectId, skipping...`);
    return;
  }

  let withdrawalFee = 0;

  const allPayouts = [
    ...previouslyProcessedPayouts,
    ...(currentInvoicePayouts ?? []),
  ];

  // this should never happen but just in case
  if (allPayouts.length === 0) {
    console.log(`No payouts found for partner ${partner.id}, skipping...`);
    return;
  }

  // will be used for transfer_group and idempotencyKey
  const finalPayoutInvoiceId = allPayouts[allPayouts.length - 1].invoiceId;

  // total transferable amount is the sum of all previously processed payouts (but not sent yet) and the current invoice payouts
  const totalTransferableAmount = allPayouts.reduce(
    (acc, payout) => acc + payout.amount,
    0,
  );

  // If the total transferable amount is less than the partner's minimum withdrawal amount
  // we only update status for all the partner payouts for the current invoice (if any) to "processed" – no need to create a transfer for now
  if (totalTransferableAmount < partner.minWithdrawalAmount) {
    if (currentInvoicePayouts) {
      await prisma.payout.updateMany({
        where: {
          id: {
            in: currentInvoicePayouts.map((p) => p.id),
          },
        },
        data: {
          status: "processed",
        },
      });
    }

    console.log(
      `Total processed payouts (${currencyFormatter(totalTransferableAmount / 100)}) for partner ${partner.id} are below the minWithdrawalAmount (${currencyFormatter(partner.minWithdrawalAmount / 100)}), skipping...`,
    );

    return;
  }

  // Decide if we need to charge a withdrawal fee for the partner
  if (partner.minWithdrawalAmount < MIN_WITHDRAWAL_AMOUNT_CENTS) {
    withdrawalFee = BELOW_MIN_WITHDRAWAL_FEE_CENTS;
  }

  // Minus the withdrawal fee from the total amount
  const finalTransferableAmount = totalTransferableAmount - withdrawalFee;

  if (finalTransferableAmount <= 0) {
    console.log(
      `Final transferable amount after deducting withdrawal fee (${currencyFormatter(finalTransferableAmount / 100)}) is less than or equal to 0, skipping...`,
    );

    return;
  }

  // Create a transfer for the partner combined payouts and update it as sent
  const transfer = await stripe.transfers.create(
    {
      amount: finalTransferableAmount,
      currency: "usd",
      // here, `transfer_group` technically only used to associate the transfer with the invoice
      // (even though the transfer could technically include payouts from multiple invoices)
      transfer_group: finalPayoutInvoiceId!,
      destination: partner.stripeConnectId,
      description: `Dub Partners payout for ${allPayouts.map((p) => p.id).join(", ")}`,
    },
    {
      idempotencyKey: `${finalPayoutInvoiceId}-${partner.id}`,
    },
  );

  console.log(
    `Transfer of ${currencyFormatter(finalTransferableAmount / 100)} (${transfer.id}) created for partner ${partner.id} for ${pluralize(
      "payout",
      allPayouts.length,
    )} ${allPayouts.map((p) => p.id).join(", ")}`,
  );

  await Promise.allSettled([
    prisma.payout.updateMany({
      where: {
        id: {
          in: allPayouts.map((p) => p.id),
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
          in: allPayouts.map((p) => p.id),
        },
      },
      data: {
        status: "paid",
      },
    }),
  ]);
};
