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
    icon: <Paypal className="size-4" />,
    iconBgColor: "bg-blue-100",
  },
  {
    id: "venmo",
    name: "Venmo",
    icon: <Paypal className="size-4" />, // TODO: add venmo icon
    iconBgColor: "bg-blue-100",
  },
  // TODO: [dots] add remaining platforms – venmo, cash_app, intl_transfer, airtm, payoneer
];
