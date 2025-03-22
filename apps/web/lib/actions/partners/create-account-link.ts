"use server";

import { stripe } from "@/lib/stripe";
import { createConnectedAccount } from "@/lib/stripe/create-connected-account";
import { prisma } from "@dub/prisma";
import {
  CONNECT_SUPPORTED_COUNTRIES,
  COUNTRIES,
  PARTNERS_DOMAIN,
} from "@dub/utils";
import { authPartnerActionClient } from "../safe-action";

export const createAccountLinkAction = authPartnerActionClient.action(
  async ({ ctx }) => {
    let { partner } = ctx;

    if (!partner.stripeConnectId) {
      // this should never happen
      if (!partner.email) {
        throw new Error(
          "Partner does not have a valid email. Please contact support to update your email.",
        );
      }

      if (!partner.country) {
        throw new Error(
          "You haven't set your country yet. Please go to partners.dub.co/onboarding to set your country.",
        );
      }

      // guard against unsupported countries
      if (!CONNECT_SUPPORTED_COUNTRIES.includes(partner.country)) {
        throw new Error(
          `Your current country (${COUNTRIES[partner.country]}) is not supported for Stripe Connect. Please go to partners.dub.co/onboarding to update your country, or contact support.`,
        );
      }
      // create a new account
      const connectedAccount = await createConnectedAccount({
        name: partner.name,
        email: partner.email,
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

    const { url } = partner.payoutsEnabledAt
      ? await stripe.accounts.createLoginLink(partner.stripeConnectId)
      : await stripe.accountLinks.create({
          account: partner.stripeConnectId,
          refresh_url: `${PARTNERS_DOMAIN}/settings/payouts`,
          return_url: `${PARTNERS_DOMAIN}/settings/payouts`,
          type: "account_onboarding",
          collect: "eventually_due",
        });

    return {
      url,
    };
  },
);
