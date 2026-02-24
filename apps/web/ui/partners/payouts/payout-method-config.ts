import type { PartnerPayoutMethod } from "@dub/prisma/client";
import { CircleDollar, GreekTemple, Paypal, Stablecoin } from "@dub/ui";
import { Calendar, Globe, MapPin, Zap } from "lucide-react";
import type { ComponentType } from "react";

export const PAYOUT_METHODS = [
  {
    id: "stablecoin" as const,
    title: "Stablecoin",
    recommended: true,
    icon: Stablecoin,
    iconWrapperClass: "border-[#1717170D] bg-blue-100",
    features: [
      { icon: CircleDollar, text: "Paid in USDC" },
      { icon: Globe, text: "No local bank required" },
      { icon: Zap, text: "Payouts deposited instantly" },
    ],
  },
  {
    id: "connect" as const,
    title: "Bank Account",
    recommended: false,
    icon: GreekTemple,
    iconWrapperClass: "border-[#1717171A] bg-white text-content-emphasis",
    features: [
      { icon: MapPin, text: "Paid in local currency" },
      { icon: GreekTemple, text: "Local bank required" },
      { icon: Calendar, text: "Payouts deposited in days" },
    ],
  },
  {
    id: "paypal" as const,
    title: "PayPal",
    recommended: false,
    icon: Paypal,
    iconWrapperClass: "border-[#1717171A] bg-white p-2",
    features: [
      { icon: MapPin, text: "Paid in local currency" },
      { icon: GreekTemple, text: "May require a linked bank" },
      { icon: Zap, text: "Payouts deposited instantly" },
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
