import { stripe } from "@/lib/stripe";
import { sendEmail } from "@dub/email";
import DuplicatePayoutMethod from "@dub/email/templates/duplicate-payout-method";
import { prisma } from "@dub/prisma";
import { log } from "@dub/utils";
import Stripe from "stripe";

export async function accountUpdated(event: Stripe.Event) {
  const account = event.data.object as Stripe.Account;

  const { country, payouts_enabled } = account;

  const partner = await prisma.partner.findUnique({
    select: {
      id: true,
      stripeConnectId: true,
      email: true,
      payoutsEnabledAt: true,
    },
    where: {
      stripeConnectId: account.id,
    },
  });

  if (!partner) {
    return `Partner with stripeConnectId ${account.id} not found, skipping...`;
  }

  if (!payouts_enabled) {
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

  try {
    await prisma.partner.update({
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
    return `Updated partner ${partner.email} (${partner.stripeConnectId}) with country ${country}, payoutsEnabledAt set, payoutMethodHash ${defaultExternalAccount.fingerprint}`;
  } catch (error) {
    if (
      error.code === "P2002" &&
      defaultExternalAccount.object === "bank_account"
    ) {
      const res = await sendEmail({
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
      });
      console.log(res);
      return `Notified partner ${partner.email} (${partner.stripeConnectId}) about duplicate payout method`;
    }
    await log({
      message: `Error updating partner ${partner.email} (${partner.stripeConnectId}): ${error}`,
      type: "errors",
    });
    return `Error updating partner ${partner.email} (${partner.stripeConnectId}): ${error}`;
  }
}
