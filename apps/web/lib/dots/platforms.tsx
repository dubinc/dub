import { GreekTemple, Paypal } from "@dub/ui/src/icons";

export const DOTS_PAYOUT_PLATFORMS = [
  {
    id: "ach",
    name: "ACH",
    icon: <GreekTemple className="size-4 text-neutral-700" />,
    iconBgColor: "bg-neutral-100",
  },
  {
    id: "paypal",
    name: "PayPal",
    icon: <Paypal className="size-4 text-neutral-700" />,
    iconBgColor: "bg-blue-100",
  },
];
