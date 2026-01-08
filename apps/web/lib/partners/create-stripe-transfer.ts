import {
  BELOW_MIN_WITHDRAWAL_FEE_CENTS,
  MIN_FORCE_WITHDRAWAL_AMOUNT_CENTS,
  MIN_WITHDRAWAL_AMOUNT_CENTS,
} from "@/lib/constants/payouts";
import { stripe } from "@/lib/stripe";
import { sendEmail } from "@dub/email";
import PartnerPayoutProcessed from "@dub/email/templates/partner-payout-processed";
import { prisma } from "@dub/prisma";
import { Payout, Prisma } from "@dub/prisma/client";
import { currencyFormatter, pluralize } from "@dub/utils";

export type PayoutWithProgramName = Pick<
  Payout,
  "id" | "amount" | "invoiceId"
> & {
  program: {
    name: string;
  };
};

export const createStripeTransfer = async ({
  partnerId,
  invoiceId,
  chargeId,
  forceWithdrawal = false,
}: {
  partnerId: string;
  invoiceId?: string;
  chargeId?: string;
  forceWithdrawal?: boolean;
}) => {
  const partner = await prisma.partner.findUniqueOrThrow({
    where: {
      id: partnerId,
    },
    select: {
      id: true,
      email: true,
      stripeConnectId: true,
      payoutsEnabledAt: true,
    },
  });

  // should never happen, but just in case
  if (!partner.stripeConnectId || !partner.payoutsEnabledAt) {
    throw new Error(
      `Partner ${partner.email} does not have an active payout account`,
    );
  }

  const commonInclude: Prisma.PayoutInclude = {
    program: {
      select: {
        name: true,
        logo: true,
      },
    },
  };

  const [previouslyProcessedPayouts, currentInvoicePayouts] = await Promise.all(
    [
      prisma.payout.findMany({
        where: {
          partnerId: partner.id,
          status: "processed",
          stripeTransferId: null,
        },
        include: commonInclude,
      }),
      prisma.payout.findMany({
        where: {
          partnerId: partner.id,
          invoiceId,
          status: "processing",
        },
        include: commonInclude,
      }),
    ],
  );

  const allPayouts = [...previouslyProcessedPayouts, ...currentInvoicePayouts];

  // this should never happen but just in case
  if (allPayouts.length === 0) {
    console.log(
      `No available payouts found for partner ${partner.email}, skipping...`,
    );
    return;
  }

  // total transferable amount is the sum of all previously processed payouts (but not sent yet) and the current invoice payouts
  const totalTransferableAmount = allPayouts.reduce(
    (acc, payout) => acc + payout.amount,
    0,
  );

  let withdrawalFee = 0;

  // If the total transferable amount is less than the minimum withdrawal amount
  if (totalTransferableAmount < MIN_WITHDRAWAL_AMOUNT_CENTS) {
    // if we're forcing a withdrawal, we need to charge a withdrawal fee
    if (forceWithdrawal) {
      withdrawalFee = BELOW_MIN_WITHDRAWAL_FEE_CENTS;
      // else, we will just update current invoice payouts to "processed" status
    } else {
      await updateCurrentInvoicePayoutsToProcessed(currentInvoicePayouts);

      console.log(
        `Total processed payouts (${currencyFormatter(totalTransferableAmount)}) for partner ${partner.id} are below ${currencyFormatter(MIN_WITHDRAWAL_AMOUNT_CENTS)}, skipping...`,
      );

      // skip creating a transfer
      return;
    }
  }

  // Minus the withdrawal fee from the total amount
  const finalTransferableAmount = totalTransferableAmount - withdrawalFee;

  if (finalTransferableAmount < MIN_FORCE_WITHDRAWAL_AMOUNT_CENTS) {
    throw new Error(
      `Final transferable amount (${currencyFormatter(finalTransferableAmount)}) is less than the minimum amount required for withdrawal (${currencyFormatter(MIN_FORCE_WITHDRAWAL_AMOUNT_CENTS)})`,
    );
  }

  const allPayoutsProgramNames = [
    ...new Set(allPayouts.map((p) => p.program.name)), // deduplicate program names
  ];

  const stripeConnectAccount = await stripe.accounts.retrieve(
    partner.stripeConnectId,
  );

  if (
    !stripeConnectAccount.payouts_enabled ||
    !stripeConnectAccount.capabilities?.transfers ||
    stripeConnectAccount.capabilities.transfers === "inactive"
  ) {
    await prisma.partner.update({
      where: {
        id: partner.id,
      },
      data: {
        payoutsEnabledAt: null,
      },
    });
    console.log(`Updated partner ${partner.email} with payoutsEnabledAt null`);

    await updateCurrentInvoicePayoutsToProcessed(currentInvoicePayouts);

    throw new Error(
      `Partner's Stripe Express account (${partner.stripeConnectId}) is not configured to receive transfers`,
    );
  }

  // will be used for transfer_group and idempotencyKey
  const finalPayoutInvoiceId = allPayouts[allPayouts.length - 1].invoiceId;

  // Create a transfer for the partner combined payouts and update it as sent
  const transfer = await stripe.transfers.create(
    {
      amount: finalTransferableAmount,
      currency: "usd",
      // here, `transfer_group` technically only used to associate the transfer with the invoice
      // (even though the transfer could technically include payouts from multiple invoices)
      transfer_group: finalPayoutInvoiceId!,
      destination: partner.stripeConnectId,
      description: `Dub Partners payout transfer (${allPayoutsProgramNames.join(", ")})`,
      // Omit `source_transaction` if prior processed payouts exist to ensure this transfer
      // never exceeds the original charge amount.
      ...(previouslyProcessedPayouts.length === 0 &&
        chargeId && {
          source_transaction: chargeId,
        }),
    },
    {
      idempotencyKey: `${finalPayoutInvoiceId}-${partner.id}`,
    },
  );

  console.log(
    `Transfer of ${currencyFormatter(finalTransferableAmount)} (${transfer.id}) created for partner ${partner.id} for ${pluralize(
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

  if (partner.email && currentInvoicePayouts.length > 0) {
    const payout = currentInvoicePayouts[0];
    const emailRes = await sendEmail({
      variant: "notifications",
      to: partner.email,
      subject: `You've received a ${currencyFormatter(payout.amount)} payout from ${payout.program.name}`,
      react: PartnerPayoutProcessed({
        email: partner.email,
        program: payout.program,
        payout,
        variant: "stripe",
      }),
    });

    console.log(`Resend email sent: ${JSON.stringify(emailRes, null, 2)}`);
  }

  return transfer;
};

const updateCurrentInvoicePayoutsToProcessed = async (
  currentInvoicePayouts: Pick<Payout, "id">[],
) => {
  if (currentInvoicePayouts.length > 0) {
    const res = await prisma.payout.updateMany({
      where: {
        id: {
          in: currentInvoicePayouts.map((p) => p.id),
        },
      },
      data: {
        status: "processed",
        paidAt: new Date(),
      },
    });
    console.log(
      `Updated ${res.count} payouts in current invoice to "processed" status`,
    );
  }
};
