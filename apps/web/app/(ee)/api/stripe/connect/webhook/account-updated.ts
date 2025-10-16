import { stripe } from "@/lib/stripe";
import { sendEmail } from "@dub/email";
import ConnectedPayoutMethod from "@dub/email/templates/connected-payout-method";
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

  let duplicatePayoutMethod = false;
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
  } catch (error) {
    if (error.code === "P2002") {
      duplicatePayoutMethod = true;
    } else {
      await log({
        message: `Error updating partner ${partner.email} (${partner.stripeConnectId}): ${error}`,
        type: "errors",
      });
      return `Error updating partner ${partner.email} (${partner.stripeConnectId}): ${error}`;
    }
  }

  // only notify if partner has an email + payouts were not already enabled before
  // and the default external account is a bank account
  if (
    partner.email &&
    !partner.payoutsEnabledAt &&
    defaultExternalAccount.object === "bank_account"
  ) {
    const EmailTemplate = duplicatePayoutMethod
      ? DuplicatePayoutMethod
      : ConnectedPayoutMethod;

    const res = await sendEmail({
      variant: "notifications",
      subject: duplicatePayoutMethod
        ? "Duplicate payout method detected"
        : "Successfully connected payout method",
      to: partner.email,
      react: EmailTemplate({
        email: partner.email,
        payoutMethod: {
          account_holder_name: defaultExternalAccount.account_holder_name,
          bank_name: defaultExternalAccount.bank_name,
          last4: defaultExternalAccount.last4,
          routing_number: defaultExternalAccount.routing_number,
        },
      }),
    });
    console.log(`Resend response: ${JSON.stringify(res, null, 2)}`);
    return `Notified partner ${partner.email} (${partner.stripeConnectId}) about ${duplicatePayoutMethod ? "duplicate" : "connected"} payout method`;
  }

  return `Updated partner ${partner.email} (${partner.stripeConnectId}) with country ${country}, payoutsEnabledAt set, payoutMethodHash ${defaultExternalAccount.fingerprint}`;
}
