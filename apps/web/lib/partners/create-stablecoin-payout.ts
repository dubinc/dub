import { sendEmail } from "@dub/email";
import PartnerPayoutProcessed from "@dub/email/templates/partner-payout-processed";
import { prisma } from "@dub/prisma";
import { currencyFormatter, prettyPrint } from "@dub/utils";
import { STABLECOIN_PAYOUT_FEE_RATE } from "../constants/payouts";
import { markPayoutsAsProcessed } from "../payouts/api/mark-payouts-as-processed";
import { createStripeOutboundPayment } from "../stripe/create-stripe-outbound-payment";
import { getStripeRecipientAccount } from "../stripe/get-stripe-recipient-account";

interface CreateStablecoinPayoutParams {
  partnerId: string;
  invoiceId?: string;
}

export const createStablecoinPayout = async ({
  partnerId,
  invoiceId,
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

  const payouts = await prisma.payout.findMany({
    where: {
      partnerId: partner.id,
      invoiceId,
      stripePayoutId: null,
      status: "processing",
      method: "stablecoin",
    },
    include: {
      program: {
        select: {
          name: true,
          logo: true,
        },
      },
    },
  });

  if (payouts.length === 0) {
    console.warn(
      `No available payouts found for partner ${partner.email} in invoice ${invoiceId}.`,
    );
    return;
  }

  let totalTransferableAmount = payouts.reduce(
    (acc, payout) => acc + payout.amount,
    0,
  );

  if (totalTransferableAmount <= 0) {
    console.warn(
      `Total transferable amount for partner ${partner.email} in invoice ${invoiceId} is less than 0.`,
    );
    return;
  }

  // Stablecoin payouts incur an outbound fee that is passed along to partners.
  totalTransferableAmount -=
    totalTransferableAmount * STABLECOIN_PAYOUT_FEE_RATE;

  if (totalTransferableAmount <= 0) {
    console.warn(
      `Total transferable amount for partner ${partner.email} in invoice ${invoiceId} is less than 0.`,
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

    await markPayoutsAsProcessed(payouts);

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

    await markPayoutsAsProcessed(payouts);

    throw new Error(
      `Stripe recipient account for partner ${partner.email} does not have crypto wallet capabilities.`,
    );
  }

  const allPayoutsProgramNames = [
    ...new Set(payouts.map((p) => p.program.name)),
  ];

  const outboundPayment = await createStripeOutboundPayment({
    stripeRecipientId: partner.stripeRecipientId,
    amount: totalTransferableAmount,
    description: `Dub Partners payout (${allPayoutsProgramNames.join(", ")})`,
    idempotencyKey: `${invoiceId}-${partner.id}`,
  });

  if (!outboundPayment.id) {
    console.error(
      `Failed to create outbound payment for partner ${partner.email} in invoice ${invoiceId}.`,
    );
    return;
  }

  await prisma.$transaction([
    prisma.payout.updateMany({
      where: {
        id: {
          in: payouts.map((p) => p.id),
        },
      },
      data: {
        stripePayoutId: outboundPayment.id,
        status: "sent",
        paidAt: new Date(),
      },
    }),

    prisma.commission.updateMany({
      where: {
        payoutId: {
          in: payouts.map((p) => p.id),
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

  const payout = payouts[0];

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
