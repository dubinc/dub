import { detectDuplicatePayoutMethodFraud } from "@/lib/api/fraud/detect-duplicate-payout-method-fraud";
import { qstash } from "@/lib/cron";
import { getPartnerBankAccount } from "@/lib/partners/get-partner-bank-account";
import { sendEmail } from "@dub/email";
import ConnectedPayoutMethod from "@dub/email/templates/connected-payout-method";
import DuplicatePayoutMethod from "@dub/email/templates/duplicate-payout-method";
import { prisma } from "@dub/prisma";
import { APP_DOMAIN_WITH_NGROK } from "@dub/utils";
import Stripe from "stripe";

const stripePayoutQueue = qstash.queue({
  queueName: "send-stripe-payout",
});

const balanceAvailableQueue = qstash.queue({
  queueName: "handle-balance-available",
});

export async function accountUpdated(event: Stripe.Event) {
  const account = event.data.object as Stripe.Account;

  const { country, payouts_enabled: payoutsEnabled, capabilities } = account;

  const partner = await prisma.partner.findUnique({
    where: {
      stripeConnectId: account.id,
    },
    select: {
      id: true,
      stripeConnectId: true,
      email: true,
      payoutsEnabledAt: true,
      payoutMethodHash: true,
    },
  });

  if (!partner) {
    return `Partner with stripeConnectId ${account.id} not found, skipping...`;
  }

  if (
    !payoutsEnabled ||
    !capabilities?.transfers ||
    capabilities.transfers === "inactive"
  ) {
    if (partner.payoutsEnabledAt) {
      await prisma.partner.update({
        where: {
          id: partner.id,
        },
        data: {
          payoutsEnabledAt: null,
        },
      });
      // TODO: notify partner about the change
      return `Payouts disabled, updated partner ${partner.email} (${partner.stripeConnectId}) with payoutsEnabledAt null`;
    }
    return `No change in payout status for ${partner.email} (${partner.stripeConnectId}), skipping...`;
  }

  const bankAccount = await getPartnerBankAccount(partner.stripeConnectId!);

  if (!bankAccount) {
    // TODO: account for cases where partner connects a debit card instead
    return `No bank account found for partner ${partner.email} (${partner.stripeConnectId}), skipping...`;
  }

  const { payoutMethodHash } = await prisma.partner.update({
    where: {
      stripeConnectId: account.id,
    },
    data: {
      country,
      payoutsEnabledAt: partner.payoutsEnabledAt
        ? undefined // Don't update if already set
        : new Date(),
      payoutMethodHash: bankAccount.fingerprint,
    },
  });

  if (payoutMethodHash) {
    const [duplicatePartnersCount, _] = await Promise.all([
      prisma.partner.count({
        where: {
          payoutMethodHash,
          id: {
            not: partner.id,
          },
        },
      }),

      detectDuplicatePayoutMethodFraud(payoutMethodHash),
    ]);

    // Send confirmation email only if this is the first time connecting a bank account
    if (
      duplicatePartnersCount === 0 &&
      partner.email &&
      !partner.payoutsEnabledAt
    ) {
      await sendEmail({
        variant: "notifications",
        subject: "Successfully connected payout method",
        to: partner.email,
        react: ConnectedPayoutMethod({
          email: partner.email,
          payoutMethod: bankAccount,
        }),
      });
    }

    // Notify the partner about duplicate payout method
    if (duplicatePartnersCount > 0 && partner.email) {
      await sendEmail({
        variant: "notifications",
        subject: "Duplicate payout method detected",
        to: partner.email,
        react: DuplicatePayoutMethod({
          email: partner.email,
          payoutMethod: bankAccount,
        }),
      });
    }
  }

  // Retry payouts that got stuck when the account was restricted
  // (e.g: previously processed payouts OR payouts that were sent but paused due to verification requirements).
  // Once payouts are re-enabled, queue them for processing.
  const [previouslyProcessedPayouts, payoutsToWithdraw] = await Promise.all([
    prisma.payout.count({
      where: {
        partnerId: partner.id,
        status: "processed",
        stripeTransferId: null,
      },
    }),
    prisma.payout.count({
      where: {
        partnerId: partner.id,
        status: "sent",
        mode: "internal",
      },
    }),
  ]);
  console.log({ previouslyProcessedPayouts, payoutsToWithdraw });

  await Promise.allSettled([
    ...(previouslyProcessedPayouts > 0
      ? [
          stripePayoutQueue
            .enqueueJSON({
              url: `${APP_DOMAIN_WITH_NGROK}/api/cron/payouts/send-stripe-payout`,
              method: "POST",
              deduplicationId: `${event.id}-send-stripe-payout`,
              body: {
                partnerId: partner.id,
              },
            })
            .then((res) => {
              console.log(
                `Enqueued send-stripe-payout queue for partner ${partner.id}: ${res.messageId}`,
              );
            }),
        ]
      : []),
    ...(payoutsToWithdraw > 0
      ? [
          balanceAvailableQueue
            .enqueueJSON({
              url: `${APP_DOMAIN_WITH_NGROK}/api/cron/payouts/balance-available`,
              deduplicationId: `${event.id}-balance-available`,
              method: "POST",
              body: {
                stripeAccount: partner.stripeConnectId,
              },
            })
            .then((res) => {
              console.log(
                `Enqueued balance-available queue for partner ${partner.stripeConnectId}: ${res.messageId}`,
              );
            }),
        ]
      : []),
  ]);

  return `Updated partner ${partner.email} (${partner.stripeConnectId}) with country ${country}, payoutsEnabledAt set, payoutMethodHash ${bankAccount.fingerprint}`;
}
