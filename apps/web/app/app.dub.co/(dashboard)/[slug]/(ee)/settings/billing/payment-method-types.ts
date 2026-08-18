"use client";

import {
  CardAmex,
  CardDiscover,
  CardMastercard,
  CardVisa,
  CreditCard,
  GreekTemple,
  StripeLink,
} from "@dub/ui/icons";
import { capitalize } from "@dub/utils";
import { Stripe } from "stripe";

const formatBankAccountDescription = ({
  bankName,
  last4,
}: {
  bankName?: string | null;
  last4?: string | null;
}) => {
  const masked = `••••${last4 ?? ""}`;
  return bankName ? `${bankName} ${masked}` : masked;
};

export const PaymentMethodTypesList = (paymentMethod?: Stripe.PaymentMethod) =>
  [
    {
      type: "card",
      title: "Card",
      icon: paymentMethod?.card
        ? {
            amex: CardAmex,
            discover: CardDiscover,
            mastercard: CardMastercard,
            visa: CardVisa,
          }[paymentMethod?.card.brand] ?? CreditCard
        : CreditCard,
      description: paymentMethod?.card
        ? `Connected ${capitalize(paymentMethod.card.brand)} ***${paymentMethod.card.last4}`
        : "No card connected",
      iconBgColor: "bg-neutral-100",
    },
    {
      type: "us_bank_account",
      title: "ACH",
      icon: GreekTemple,
      description: paymentMethod?.us_bank_account
        ? formatBankAccountDescription({
            bankName: paymentMethod.us_bank_account.bank_name,
            last4: paymentMethod.us_bank_account.last4,
          })
        : "Not connected",
    },
    {
      type: "acss_debit",
      title: "ACSS Debit",
      icon: GreekTemple,
      description: paymentMethod?.acss_debit
        ? formatBankAccountDescription({
            bankName: paymentMethod.acss_debit.bank_name,
            last4: paymentMethod.acss_debit.last4,
          })
        : "Not connected",
    },
    {
      type: "sepa_debit",
      title: "SEPA Debit",
      icon: GreekTemple,
      description: paymentMethod?.sepa_debit
        ? formatBankAccountDescription({
            last4: paymentMethod.sepa_debit.last4,
          })
        : "Not connected",
    },
    {
      type: "link",
      title: "Link",
      icon: StripeLink,
      iconBgColor: "bg-green-100",
      description: paymentMethod?.link
        ? `Account with ${paymentMethod.link?.email}`
        : "No Link account connected",
    },
  ] satisfies {
    type: Stripe.PaymentMethod.Type;
    title: string;
    icon: React.ElementType;
    description: string;
    iconBgColor?: string;
  }[];
