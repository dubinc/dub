"use server";

import { throwIfNoPermission } from "@/lib/auth/partner-users/throw-if-no-permission";
import { getPartnerFeatureFlags } from "@/lib/edge-config";
import { getPayoutMethodsForCountry } from "@/lib/partners/get-payout-methods-for-country";
import { createStripeRecipientAccount } from "@/lib/stripe/create-stripe-recipient-account";
import { createStripeRecipientAccountLink } from "@/lib/stripe/create-stripe-recipient-account-link";
import { prisma } from "@dub/prisma";
import { PartnerPayoutMethod } from "@dub/prisma/client";
import { COUNTRIES } from "@dub/utils";
import { authPartnerActionClient } from "../safe-action";

export const generateStripeRecipientAccountLink =
  authPartnerActionClient.action(async ({ ctx }) => {
    const { partner, partnerUser } = ctx;

    throwIfNoPermission({
      role: partnerUser.role,
      permission: "payout_settings.update",
    });

    const featureFlags = await getPartnerFeatureFlags(partner.id);

    if (!featureFlags.stablecoin) {
      throw new Error(
        "Stablecoin payouts are not enabled for your account yet. Please contact support.",
      );
    }

    let useCase: "account_onboarding" | "account_update" = "account_update";

    if (!partner.stripeRecipientId) {
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

      if (!availablePayoutMethods.includes(PartnerPayoutMethod.stablecoin)) {
        throw new Error(
          `Your current country (${COUNTRIES[partner.country]}) is not supported for Stablecoin payouts. Please go to partners.dub.co/settings to update your country, or contact support.`,
        );
      }

      const recipientAccount = await createStripeRecipientAccount({
        name: partner.name,
        email: partner.email,
        country: partner.country,
        profileType: partner.profileType,
      });

      partner.stripeRecipientId = recipientAccount.id;

      await prisma.partner.update({
        where: {
          id: partner.id,
        },
        data: {
          stripeRecipientId: recipientAccount.id,
        },
      });

      useCase = "account_onboarding";
    }

    const accountLink = await createStripeRecipientAccountLink({
      stripeRecipientId: partner.stripeRecipientId!,
      useCase,
    });

    return {
      url: accountLink.url,
    };
  });
