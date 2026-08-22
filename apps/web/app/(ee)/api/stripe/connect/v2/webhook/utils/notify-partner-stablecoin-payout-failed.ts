import { prisma } from "@/lib/prisma";
import { sendEmail } from "@dub/email";
import PartnerStablecoinPayoutFailed from "@dub/email/templates/partner-stablecoin-payout-failed";
import { currencyFormatter, prettyPrint } from "@dub/utils";
import { PayoutStatus } from "@prisma/client";

function maskCryptoWalletAddress(address: string) {
  return address.length > 10
    ? `${address.slice(0, 6)}••••${address.slice(-4)}`
    : address;
}

export async function notifyPartnerStablecoinPayoutFailed(
  outboundPaymentId: string,
) {
  const payouts = await prisma.payout.findMany({
    where: {
      stripePayoutId: outboundPaymentId,
      status: PayoutStatus.failed,
    },
    include: {
      partner: {
        select: {
          email: true,
          cryptoWalletAddress: true,
        },
      },
      program: {
        select: {
          name: true,
        },
      },
    },
  });

  if (payouts.length === 0) {
    console.log(
      `No payouts found for outbound payment ${outboundPaymentId}. Skipping email send...`,
    );
    return;
  }

  const partner = payouts[0].partner;

  if (!partner.email) {
    console.log(
      `Partner email not found for outbound payment ${outboundPaymentId}. Skipping email send...`,
    );
    return;
  }

  const totalAmount = payouts.reduce((acc, payout) => acc + payout.amount, 0);
  const failureReason = payouts[0].failureReason ?? undefined;

  const programs = [
    ...new Map(
      payouts.map((payout) => [payout.program.name, payout.program]),
    ).values(),
  ];

  const maskedAddress = partner.cryptoWalletAddress
    ? maskCryptoWalletAddress(partner.cryptoWalletAddress)
    : undefined;

  const emailResponse = await sendEmail({
    variant: "notifications",
    subject: `Your recent partner payout of ${currencyFormatter(totalAmount)} failed`,
    to: partner.email,
    react: PartnerStablecoinPayoutFailed({
      email: partner.email,
      programs,
      payout: {
        amount: totalAmount,
        failureReason,
      },
      wallet: maskedAddress
        ? {
            maskedAddress,
          }
        : undefined,
    }),
  });

  console.log(
    `Stablecoin payout failed email sent to partner ${partner.email}:`,
    prettyPrint(emailResponse),
  );
}
