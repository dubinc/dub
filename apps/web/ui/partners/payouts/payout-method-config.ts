import { STABLECOIN_PAYOUT_FEE_RATE } from "@/lib/constants/payouts";
import type { PartnerPayoutMethod } from "@dub/prisma/client";
import {
  Calendar6,
  CircleDollar,
  Globe,
  GreekTemple,
  Paypal,
  Stablecoin,
} from "@dub/ui";
import { MapPin, Zap } from "lucide-react";
import type { ComponentType } from "react";

export const PAYOUT_METHODS = [
  {
    id: "stablecoin" as const,
    title: "Stablecoin",
    recommended: true,
    icon: Stablecoin,
    iconWrapperClass: "border-[#1717170D] bg-blue-100",
    features: [
      {
        icon: CircleDollar,
        text: `Paid in USDC (${STABLECOIN_PAYOUT_FEE_RATE * 100}% fee)`,
      },
      { icon: Zap, text: "Payouts deposited in minutes" },
      { icon: Globe, text: "No local bank account required" },
    ],
  },
  {
    id: "connect" as const,
    title: "Bank Account",
    recommended: false,
    icon: GreekTemple,
    iconWrapperClass: "border-[#1717171A] bg-white text-content-emphasis",
    features: [
      { icon: MapPin, text: "Paid in local currency (1% FX fee)" },
      { icon: Calendar6, text: "Payouts take up to 15 business days" },
      { icon: GreekTemple, text: "Local bank account required" },
    ],
  },
  {
    id: "paypal" as const,
    title: "PayPal",
    recommended: false,
    icon: Paypal,
    iconWrapperClass: "border-[#1717171A] bg-white",
    features: [
      { icon: MapPin, text: "Paid in local currency (3% FX fee)" },
      { icon: Zap, text: "Payouts deposited in minutes" },
      {
        icon: GreekTemple,
        text: "PayPal + local bank account required",
      },
    ],
  },
] as const;

/** When bank or PayPal is the only choice (e.g. US), avoid international wire copy (FX / 15 days). */
const SOLO_BANK_FEATURES: PayoutMethodFeature[] = [
  {
    icon: CircleDollar,
    text: "Receive payouts directly in your bank account",
  },
  { icon: Zap, text: "1-time no hassle setup" },
];

const SOLO_PAYPAL_FEATURES: PayoutMethodFeature[] = [
  {
    icon: CircleDollar,
    text: "Receive payouts directly via PayPal",
  },
  { icon: Zap, text: "1-time no hassle setup" },
];

export function getPayoutMethodFeaturesForSelector(
  methodId: (typeof PAYOUT_METHODS)[number]["id"],
  isSingleOption: boolean,
): readonly PayoutMethodFeature[] {
  const method = PAYOUT_METHODS.find((m) => m.id === methodId);
  if (!method) {
    return [];
  }
  if (!isSingleOption) {
    return method.features;
  }
  if (methodId === "connect") {
    return SOLO_BANK_FEATURES;
  }
  if (methodId === "paypal") {
    return SOLO_PAYPAL_FEATURES;
  }
  return method.features;
}

const PAYOUT_METHOD_ICON_CONFIG = Object.fromEntries(
  PAYOUT_METHODS.map((m) => [
    m.id,
    { Icon: m.icon, wrapperClass: m.iconWrapperClass },
  ]),
) as Record<
  PartnerPayoutMethod,
  { Icon: ComponentType<{ className?: string }>; wrapperClass: string }
>;

export function getPayoutMethodIconConfig(type: PartnerPayoutMethod) {
  return (
    PAYOUT_METHOD_ICON_CONFIG[type] ?? { Icon: GreekTemple, wrapperClass: "" }
  );
}

export function getPayoutMethodLabel(type: PartnerPayoutMethod): string {
  return PAYOUT_METHODS.find((m) => m.id === type)?.title ?? type;
}

export type PayoutMethodFeature = {
  icon: ComponentType<{ className?: string }>;
  text: string;
};
