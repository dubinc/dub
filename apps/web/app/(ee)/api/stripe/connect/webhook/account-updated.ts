import { detectDuplicatePayoutMethodFraud } from "@/lib/api/fraud/detect-duplicate-payout-method-fraud";
import { qstash } from "@/lib/cron";
import { getPartnerBankAccount } from "@/lib/partners/get-partner-bank-account";
import { sendEmail } from "@dub/email";
import ConnectedPayoutMethod from "@dub/email/templates/connected-payout-method";
import DuplicatePayoutMethod from "@dub/email/templates/duplicate-payout-method";
import { prisma } from "@dub/prisma";
import { APP_DOMAIN_WITH_NGROK } from "@dub/utils";
import Stripe from "stripe";

const queue = qstash.queue({
  queueName: "handle-balance-available",
});

export async function accountUpdated(event: Stripe.Event) {
  const account = event.data.object as Stripe.Account;

  const { country, payouts_enabled: payoutsEnabled } = account;

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

  if (!payoutsEnabled) {
    if (partner.payoutsEnabledAt || partner.payoutMethodHash) {
      await prisma.partner.update({
        where: {
          id: partner.id,
        },
        data: {
          payoutsEnabledAt: null,
          payoutMethodHash: null,
        },
      });
      // TODO: notify partner about the change
      return `Payouts disabled, updated partner ${partner.email} (${partner.stripeConnectId}) with payoutsEnabledAt and payoutMethodHash null`;
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

  // Retry payouts that got stuck when the account was restricted (e.g: payout sent but paused
  // due to verification requirements). Once payouts are re-enabled, queue them for processing.
  const pendingPayouts = await prisma.payout.count({
    where: {
      partnerId: partner.id,
      status: "sent",
      mode: "internal",
    },
  });

  if (pendingPayouts > 0) {
    const response = await queue.enqueueJSON({
      url: `${APP_DOMAIN_WITH_NGROK}/api/cron/payouts/balance-available`,
      deduplicationId: event.id,
      method: "POST",
      body: {
        stripeAccount: partner.stripeConnectId,
      },
    });
    return `Enqueued handle-balance-available queue for partner ${partner.stripeConnectId}: ${response.messageId}`;
  }

  return `Updated partner ${partner.email} (${partner.stripeConnectId}) with country ${country}, payoutsEnabledAt set, payoutMethodHash ${bankAccount.fingerprint}`;
}
