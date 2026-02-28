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
    iconWrapperClass: "border-[#1717171A] bg-white p-2",
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

export type PayoutMethodFeature = {
  icon: ComponentType<{ className?: string }>;
  text: string;
};
