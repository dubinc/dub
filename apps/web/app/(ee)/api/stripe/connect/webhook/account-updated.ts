import { detectAndRecordPartnerFraud } from "@/lib/api/fraud/detect-record-fraud-partner";
import { stripe } from "@/lib/stripe";
import { prisma } from "@dub/prisma";
import { log } from "@dub/utils";
import { waitUntil } from "@vercel/functions";
import Stripe from "stripe";

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

  const updatedPartner = await prisma.partner.update({
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

  waitUntil(
    detectAndRecordPartnerFraud({
      context: { partner: updatedPartner },
      ruleTypes: ["partnerDuplicatePayoutMethod"],
    }),
  );

  return `Updated partner ${partner.email} (${partner.stripeConnectId}) with country ${country}, payoutsEnabledAt set, payoutMethodHash ${defaultExternalAccount.fingerprint}`;
}
