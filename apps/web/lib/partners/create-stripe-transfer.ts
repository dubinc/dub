import { trackCommissionStatusUpdatesByProgram } from "@/lib/api/commissions/track-commission-update-activity-log";
import {
  BELOW_MIN_WITHDRAWAL_FEE_CENTS,
  MIN_FORCE_WITHDRAWAL_AMOUNT_CENTS,
  MIN_WITHDRAWAL_AMOUNT_CENTS,
} from "@/lib/constants/payouts";
import { prisma } from "@/lib/prisma";
import { stripe } from "@/lib/stripe";
import { sendEmail } from "@dub/email";
import PartnerPayoutForceWithdrawal from "@dub/email/templates/partner-payout-force-withdrawal";
import PartnerPayoutProcessed from "@dub/email/templates/partner-payout-processed";
import {
  APP_DOMAIN_WITH_NGROK,
  chunk,
  currencyFormatter,
  log,
  pluralize,
} from "@dub/utils";
import { Prisma } from "@prisma/client";
import { waitUntil } from "@vercel/functions";
import { enqueueBatchJobs } from "../cron/enqueue-batch-jobs";
import { createPayoutsIdempotencyKey } from "../payouts/create-payouts-idempotency-key";
import { markPayoutsAsProcessed } from "../payouts/mark-payouts-as-processed";

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
        id: true,
        name: true,
        logo: true,
        workspaceId: true,
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
          method: "connect",
        },
        orderBy: {
          id: "asc",
        },
        include: commonInclude,
      }),

      invoiceId
        ? prisma.payout.findMany({
            where: {
              partnerId: partner.id,
              invoiceId,
              status: "processing",
              method: "connect",
            },
            orderBy: {
              id: "asc",
            },
            include: commonInclude,
          })
        : Promise.resolve([]),
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

  if (totalTransferableAmount < MIN_FORCE_WITHDRAWAL_AMOUNT_CENTS) {
    const message = `Total transferable amount (${currencyFormatter(totalTransferableAmount)}) is less than the minimum amount required for withdrawal (${currencyFormatter(MIN_FORCE_WITHDRAWAL_AMOUNT_CENTS)}).`;

    // For force-withdrawal action, throw so the error surfaces back to partners.
    // Otherwise (e.g. cron-driven payouts) just log and skip silently.
    if (forceWithdrawal) {
      throw new Error(message);
    } else {
      console.warn(message);
      return;
    }
  }

  let withdrawalFee = 0;

  // If the total transferable amount is less than the minimum withdrawal amount
  if (totalTransferableAmount < MIN_WITHDRAWAL_AMOUNT_CENTS) {
    // if we're forcing a withdrawal, we need to charge a withdrawal fee
    if (forceWithdrawal) {
      withdrawalFee = BELOW_MIN_WITHDRAWAL_FEE_CENTS;
      // else, we will just update current invoice payouts to "processed" status
    } else {
      await markPayoutsAsProcessed(currentInvoicePayouts);

      console.log(
        `Total processed payouts (${currencyFormatter(totalTransferableAmount)}) for partner ${partner.id} are below ${currencyFormatter(MIN_WITHDRAWAL_AMOUNT_CENTS)}, skipping...`,
      );

      // skip creating a transfer
      return;
    }
  }

  // Minus the withdrawal fee from the total amount
  const finalTransferableAmount = totalTransferableAmount - withdrawalFee;

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
        defaultPayoutMethod: null,
      },
    });

    console.log(`Updated partner ${partner.email} with payoutsEnabledAt null`);

    await markPayoutsAsProcessed(currentInvoicePayouts);

    throw new Error(
      `Partner's Stripe Express account (${partner.stripeConnectId}) is not configured to receive transfers`,
    );
  }

  // will be used for transfer_group
  const finalPayoutInvoiceId = allPayouts[allPayouts.length - 1].invoiceId;

  const idempotencyKey = createPayoutsIdempotencyKey({
    partnerId: partner.id,
    invoiceId,
    payoutIds: allPayouts.map((p) => p.id),
  });

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
      idempotencyKey,
    },
  );

  console.log(
    `Transfer of ${currencyFormatter(finalTransferableAmount)} (${transfer.id}) created for partner ${partner.id} for ${pluralize(
      "payout",
      allPayouts.length,
    )} ${allPayouts.map((p) => p.id).join(", ")}`,
  );

  const payoutIds = allPayouts.map((p) => p.id);

  const commissions = await prisma.commission.findMany({
    where: {
      payoutId: {
        in: payoutIds,
      },
    },
    select: {
      id: true,
      amount: true,
      earnings: true,
      status: true,
      programId: true,
    },
  });

  await prisma.payout.updateMany({
    where: {
      id: {
        in: payoutIds,
      },
    },
    data: {
      stripeTransferId: transfer.id,
      status: "sent",
      paidAt: new Date(),
      method: "connect",
    },
  });

  const commissionIds = commissions.map((c) => c.id);

  let totalUpdatedCommissions = 0;
  for (const commissionIdsBatch of chunk(commissionIds, 250)) {
    try {
      const { count } = await prisma.commission.updateMany({
        where: {
          id: {
            in: commissionIdsBatch,
          },
        },
        data: {
          status: "paid",
        },
      });

      totalUpdatedCommissions += count;
      console.log(
        `Marked ${totalUpdatedCommissions}/${commissionIds.length} commissions as paid`,
      );
    } catch (error) {
      await log({
        message: `[createStripeTransfer] Failed to mark commissions as paid for payouts ${payoutIds.join(
          ", ",
        )}: ${error.message}`,
        type: "errors",
        mention: true,
      });
    }
  }

  waitUntil(
    Promise.allSettled([
      trackCommissionStatusUpdatesByProgram({
        commissions,
        payouts: allPayouts,
        newStatus: "paid",
      }),

      enqueueBatchJobs(
        payoutIds.map((payoutId) => ({
          queueName: "create-referral-commissions",
          url: `${APP_DOMAIN_WITH_NGROK}/api/cron/commissions/referrals/queue`,
          body: {
            payoutId,
          },
        })),
      ),
    ]),
  );

  if (partner.email) {
    const payout = currentInvoicePayouts[0];
    const emailRes = await sendEmail({
      variant: "notifications",
      to: partner.email,
      subject: forceWithdrawal
        ? `A withdrawal of ${currencyFormatter(totalTransferableAmount)} has been initiated from your Dub account`
        : `You've received a ${currencyFormatter(payout.amount)} payout from ${payout.program.name}`,
      react: forceWithdrawal
        ? PartnerPayoutForceWithdrawal({
            email: partner.email,
            payout: {
              amount: totalTransferableAmount,
              method: "connect",
            },
          })
        : PartnerPayoutProcessed({
            email: partner.email,
            program: payout.program,
            payout,
          }),
    });

    console.log(`Resend email sent: ${JSON.stringify(emailRes, null, 2)}`);
  }

  return transfer;
};
