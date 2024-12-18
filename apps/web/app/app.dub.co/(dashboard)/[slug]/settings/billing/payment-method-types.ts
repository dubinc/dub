"use client";

import { CreditCard, GreekTemple, StripeLink } from "@dub/ui/icons";
import { Stripe } from "stripe";

export const PaymentMethodTypesList = (paymentMethod?: Stripe.PaymentMethod) =>
  [
    {
      type: "card",
      title: "Card",
      icon: CreditCard,
      description: paymentMethod?.card
        ? `Connected ${paymentMethod.card.brand} ***${paymentMethod.card.last4}`
        : "No card connected",
    },
    {
      type: "us_bank_account",
      title: "ACH",
      icon: GreekTemple,
      description: paymentMethod?.us_bank_account
        ? `Connected ${paymentMethod.us_bank_account.account_holder_type} account ending in ${paymentMethod.us_bank_account.last4}`
        : "No ACH Debit connected",
    },
    {
      type: "link",
      title: "Link",
      icon: StripeLink,
      iconBgColor: "bg-green-100",
      description: paymentMethod?.link
        ? `Connected Link account ${paymentMethod.link?.email}`
        : "No Link account connected",
    },
  ] satisfies {
    type: Stripe.PaymentMethod.Type;
    title: string;
    icon: React.ElementType;
    description: string;
    iconBgColor?: string;
  }[];
