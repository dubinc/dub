import { sendEmail } from "@dub/email";
import PartnerPayoutProcessed from "@dub/email/templates/partner-payout-processed";
import { prisma } from "@dub/prisma";
import { PartnerPayoutMethod, Prisma } from "@dub/prisma/client";
import { currencyFormatter, prettyPrint } from "@dub/utils";
import { STABLECOIN_PAYOUT_FEE_RATE } from "../constants/payouts";
import { createPayoutsIdempotencyKey } from "../payouts/api/create-payouts-idempotency-key";
import { markPayoutsAsProcessed } from "../payouts/api/mark-payouts-as-processed";
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

  if (totalTransferableAmount <= 0) {
    console.warn(
      `Total transferable amount for partner ${partner.email} is less than 0.`,
    );
    return;
  }

  // Stablecoin payouts incur an outbound fee that is passed along to partners.
  totalTransferableAmount -=
    totalTransferableAmount * STABLECOIN_PAYOUT_FEE_RATE;

  // Round down to the nearest integer
  totalTransferableAmount = Math.floor(totalTransferableAmount);

  if (totalTransferableAmount <= 0) {
    console.warn(
      `Total transferable amount for partner ${partner.email} is less than 0.`,
    );
    return;
  }

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

    await markPayoutsAsProcessed(allPayouts);

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

    await markPayoutsAsProcessed(allPayouts);

    throw new Error(
      `Stripe recipient account for partner ${partner.email} does not have crypto wallet capabilities.`,
    );
  }

  const allPayoutsProgramNames = [
    ...new Set(allPayouts.map((p) => p.program.name)),
  ];

  // Find the total amount to transfer to Dub's FA
  let amountToTransferToFA = 0;

  for (const payout of previouslyProcessedPayouts) {
    if (payout.method === "connect") {
      amountToTransferToFA += payout.amount;
    }
  }

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

  const payout = allPayouts[0];

  const emailResponse = await sendEmail({
    variant: "notifications",
    to: partner.email,
    subject: `You've received a ${currencyFormatter(payout.amount)} payout from ${payout.program.name}`,
    react: PartnerPayoutProcessed({
      email: partner.email,
      program: payout.program,
      payout,
    }),
  });

  console.log(
    `Payout processed email sent to partner ${partner.email}:`,
    prettyPrint(emailResponse),
  );
};
