"use server";

import { throwIfNoPermission } from "@/lib/auth/partner-users/throw-if-no-permission";
import { getPayoutMethodsForCountry } from "@/lib/partners/get-payout-methods-for-country";
import { stripe } from "@/lib/stripe";
import { createConnectedAccount } from "@/lib/stripe/create-connected-account";
import { prisma } from "@dub/prisma";
import { PartnerPayoutMethod } from "@dub/prisma/client";
import { COUNTRIES, PARTNERS_DOMAIN } from "@dub/utils";
import { authPartnerActionClient } from "../safe-action";

export const generateStripeAccountLink = authPartnerActionClient.action(
  async ({ ctx }) => {
    const { partner, partnerUser } = ctx;

    throwIfNoPermission({
      role: partnerUser.role,
      permission: "payout_settings.update",
    });

    if (!partner.stripeConnectId) {
      // this should never happen
      if (!partner.email) {
        throw new Error(
          "Partner does not have a valid email. Please contact support to update your email.",
        );
      }

      if (!partner.country) {
        throw new Error(
          "You haven't set your country yet. Please go to partners.dub.co/settings to set your country.",
        );
      }

      const availablePayoutMethods = getPayoutMethodsForCountry({
        country: partner.country,
      });

      if (!availablePayoutMethods.includes(PartnerPayoutMethod.connect)) {
        throw new Error(
          `Your current country (${COUNTRIES[partner.country]}) is not supported for Stripe payouts. Please go to partners.dub.co/settings to update your country, or contact support.`,
        );
      }

      // create a new account
      const connectedAccount = await createConnectedAccount({
        country: partner.country,
        profileType: partner.profileType,
        companyName: partner.companyName,
      });

      partner.stripeConnectId = connectedAccount.id;

      await prisma.partner.update({
        where: { id: partner.id },
        data: { stripeConnectId: connectedAccount.id },
      });
    }

    if (!partner.stripeConnectId) {
      throw new Error(
        "Failed to create a new Stripe connect account. Please contact support.",
      );
    }

    const account = await stripe.accounts.retrieve(partner.stripeConnectId);

    const { url } =
      account.details_submitted === true
        ? await stripe.accounts.createLoginLink(partner.stripeConnectId)
        : await stripe.accountLinks.create({
            account: partner.stripeConnectId,
            refresh_url: `${PARTNERS_DOMAIN}/payouts?settings=true`,
            return_url: `${PARTNERS_DOMAIN}/payouts?settings=true`,
            type: "account_onboarding",
            collect: "eventually_due",
          });

    return {
      url,
    };
  },
);
