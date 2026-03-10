import { sendEmail } from "@dub/email";
import PartnerPayoutForceWithdrawal from "@dub/email/templates/partner-payout-force-withdrawal";
import PartnerPayoutProcessed from "@dub/email/templates/partner-payout-processed";
import { prisma } from "@dub/prisma";
import { PartnerPayoutMethod, Prisma } from "@dub/prisma/client";
import { currencyFormatter, prettyPrint } from "@dub/utils";
import {
  BELOW_MIN_WITHDRAWAL_FEE_CENTS,
  MIN_FORCE_WITHDRAWAL_AMOUNT_CENTS,
  MIN_WITHDRAWAL_AMOUNT_CENTS,
  STABLECOIN_PAYOUT_FEE_RATE,
} from "../constants/payouts";
import { createPayoutsIdempotencyKey } from "../payouts/create-payouts-idempotency-key";
import { markPayoutsAsProcessed } from "../payouts/mark-payouts-as-processed";
import { createStripeOutboundPayment } from "../stripe/create-stripe-outbound-payment";
import { fundFinancialAccount } from "../stripe/fund-financial-account";
import { getStripeRecipientAccount } from "../stripe/get-stripe-recipient-account";

interface CreateStablecoinPayoutParams {
  partnerId: string;
  invoiceId?: string;
  forceWithdrawal?: boolean;
}

export const createStablecoinPayout = async ({
  partnerId,
  invoiceId,
  forceWithdrawal = false,
}: CreateStablecoinPayoutParams) => {
  const partner = await prisma.partner.findUniqueOrThrow({
    where: {
      id: partnerId,
    },
    select: {
      id: true,
      email: true,
      stripeRecipientId: true,
      payoutsEnabledAt: true,
    },
  });

  if (!partner.payoutsEnabledAt) {
    console.warn(`Partner ${partner.email} does not have payouts enabled.`);
    return;
  }

  if (!partner.stripeRecipientId) {
    console.warn(
      `Partner ${partner.email} does not have a stripeRecipientId set.`,
    );
    return;
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
          stripePayoutId: null,
          method: {
            in: [PartnerPayoutMethod.stablecoin, PartnerPayoutMethod.connect],
          },
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
              status: "processing",
              stripePayoutId: null,
              method: "stablecoin",
              invoiceId,
            },
            orderBy: {
              id: "asc",
            },
            include: commonInclude,
          })
        : Promise.resolve([]),
    ],
  );

  if (forceWithdrawal && previouslyProcessedPayouts.length === 0) {
    throw new Error(
      "No previously processed payouts found. Please try again or contact support.",
    );
  }

  const allPayouts = [...previouslyProcessedPayouts, ...currentInvoicePayouts];

  if (allPayouts.length === 0) {
    console.warn(`No available payouts found for partner ${partner.email}.`);
    return;
  }

  const idempotencyKey = createPayoutsIdempotencyKey({
    partnerId: partner.id,
    invoiceId,
    payoutIds: allPayouts.map((p) => p.id),
  });

  let totalTransferableAmount = allPayouts.reduce(
    (acc, payout) => acc + payout.amount,
    0,
  );

  if (totalTransferableAmount < MIN_FORCE_WITHDRAWAL_AMOUNT_CENTS) {
    throw new Error(
      `Total transferable amount (${currencyFormatter(totalTransferableAmount)}) for partner ${partner.email} is less than the minimum amount required for withdrawal (${currencyFormatter(MIN_FORCE_WITHDRAWAL_AMOUNT_CENTS)}). Skipping...`,
    );
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

      return;
    }
  }

  // remove the stablecoin payout fee (0.5%) and withdrawal fee (if applicable) from the total amount
  totalTransferableAmount -=
    totalTransferableAmount * STABLECOIN_PAYOUT_FEE_RATE + withdrawalFee;

  const stripeRecipientAccount = await getStripeRecipientAccount(
    partner.stripeRecipientId,
  );

  // Stripe recipient account is closed
  if (stripeRecipientAccount.closed) {
    await prisma.partner.update({
      where: {
        id: partner.id,
      },
      data: {
        stripeRecipientId: null,
        payoutsEnabledAt: null,
      },
    });

    await markPayoutsAsProcessed(currentInvoicePayouts);

    console.warn(
      `Stripe recipient account for partner ${partner.email} is closed.`,
    );
    return;
  }

  // Stripe recipient account does not have crypto wallet capabilities
  if (
    stripeRecipientAccount.configuration?.recipient?.capabilities
      ?.crypto_wallets?.status !== "active"
  ) {
    await prisma.partner.update({
      where: {
        id: partner.id,
      },
      data: {
        payoutsEnabledAt: null,
      },
    });

    await markPayoutsAsProcessed(currentInvoicePayouts);

    throw new Error(
      `Stripe recipient account for partner ${partner.email} does not have crypto wallet capabilities.`,
    );
  }

  const allPayoutsProgramNames = [
    ...new Set(allPayouts.map((p) => p.program.name)),
  ];

  // Transfer the total of previously processed payouts to Dub's FA
  const amountToTransferToFA = previouslyProcessedPayouts.reduce(
    (acc, payout) => acc + payout.amount,
    0,
  );

  if (amountToTransferToFA > 0) {
    await fundFinancialAccount({
      amount: amountToTransferToFA,
      idempotencyKey,
    });
  }

  const outboundPayment = await createStripeOutboundPayment({
    stripeRecipientId: partner.stripeRecipientId,
    amount: totalTransferableAmount,
    description: `Dub Partners payout (${allPayoutsProgramNames.join(", ")})`,
    idempotencyKey,
  });

  if (!outboundPayment.id) {
    console.error(
      `Failed to create outbound payment for partner ${partner.email}.`,
    );
    return;
  }

  await prisma.$transaction([
    prisma.payout.updateMany({
      where: {
        id: {
          in: allPayouts.map((p) => p.id),
        },
      },
      data: {
        stripePayoutId: outboundPayment.id,
        status: "sent",
        paidAt: new Date(),
        method: "stablecoin",
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

  if (!partner.email) {
    console.warn(
      `Partner ${partner.email} does not have an email address to send the payout email to.`,
    );
    return;
  }

  const firstPayout = allPayouts[0];

  const emailResponse = await sendEmail({
    variant: "notifications",
    to: partner.email,
    subject: forceWithdrawal
      ? `A withdrawal of ${currencyFormatter(amountToTransferToFA)} has been initiated from your Dub account`
      : `You've received a ${currencyFormatter(firstPayout.amount)} payout from ${firstPayout.program.name}`,
    react: forceWithdrawal
      ? PartnerPayoutForceWithdrawal({
          email: partner.email,
          payout: {
            amount: amountToTransferToFA,
            method: "stablecoin",
          },
        })
      : PartnerPayoutProcessed({
          email: partner.email,
          program: firstPayout.program,
          payout: firstPayout,
        }),
  });

  console.log(
    `Payout processed email sent to partner ${partner.email}:`,
    prettyPrint(emailResponse),
  );
};
