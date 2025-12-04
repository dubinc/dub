import { detectDuplicatePayoutMethodFraud } from "@/lib/api/fraud/detect-duplicate-payout-method-fraud";
import { qstash } from "@/lib/cron";
import { stripe } from "@/lib/stripe";
import { sendBatchEmail, sendEmail } from "@dub/email";
import ConnectedPayoutMethod from "@dub/email/templates/connected-payout-method";
import DuplicatePayoutMethod from "@dub/email/templates/duplicate-payout-method";
import { prisma } from "@dub/prisma";
import { APP_DOMAIN_WITH_NGROK, log } from "@dub/utils";
import Stripe from "stripe";

const queue = qstash.queue({
  queueName: "withdraw-stripe-balance",
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
      return `Payouts disabled, updated partner ${partner.email} (${partner.stripeConnectId}) with payoutsEnabledAt and payoutMethodHash null`;
    }
    return `No change in payout status for ${partner.email} (${partner.stripeConnectId}), skipping...`;
  }

  const { data: externalAccounts } = await stripe.accounts.listExternalAccounts(
    partner.stripeConnectId!,
  );

  const defaultExternalAccount = externalAccounts.find(
    (account) => account.default_for_currency,
  );

  if (!defaultExternalAccount) {
    // this should never happen, but just in case
    await log({
      message: `Expected at least 1 external account for partner ${partner.email} (${partner.stripeConnectId}), none found`,
      type: "errors",
    });
    return `Expected at least 1 external account for partner ${partner.email} (${partner.stripeConnectId}), none found`;
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
      payoutMethodHash: defaultExternalAccount.fingerprint,
    },
  });

  if (payoutMethodHash) {
    const { isPayoutMethodDuplicate, duplicatePartners } =
      await detectDuplicatePayoutMethodFraud(payoutMethodHash);

    // Send confirmation email only if this is the first time connecting a bank account and no fraud detected
    if (
      partner.email &&
      !partner.payoutsEnabledAt &&
      !isPayoutMethodDuplicate &&
      defaultExternalAccount.object === "bank_account"
    ) {
      await sendEmail({
        variant: "notifications",
        subject: "Successfully connected payout method",
        to: partner.email,
        react: ConnectedPayoutMethod({
          email: partner.email,
          payoutMethod: {
            account_holder_name: defaultExternalAccount.account_holder_name,
            bank_name: defaultExternalAccount.bank_name,
            last4: defaultExternalAccount.last4,
            routing_number: defaultExternalAccount.routing_number,
          },
        }),
      });
    }

    // Notify all partners using the same bank account about duplicate payout method
    if (
      isPayoutMethodDuplicate &&
      duplicatePartners.length > 0 &&
      defaultExternalAccount.object === "bank_account"
    ) {
      await sendBatchEmail(
        duplicatePartners.map((partner) => ({
          variant: "notifications",
          subject: "Duplicate payout method detected",
          to: partner.email!,
          react: DuplicatePayoutMethod({
            email: partner.email!,
            payoutMethod: {
              account_holder_name: defaultExternalAccount.account_holder_name,
              bank_name: defaultExternalAccount.bank_name,
              last4: defaultExternalAccount.last4,
              routing_number: defaultExternalAccount.routing_number,
            },
          }),
        })),
      );
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
    await queue.enqueueJSON({
      url: `${APP_DOMAIN_WITH_NGROK}/api/cron/payouts/balance-available`,
      deduplicationId: event.id,
      method: "POST",
      body: {
        stripeAccount: partner.stripeConnectId,
      },
    });
  }

  return `Updated partner ${partner.email} (${partner.stripeConnectId}) with country ${country}, payoutsEnabledAt set, payoutMethodHash ${defaultExternalAccount.fingerprint}`;
}
