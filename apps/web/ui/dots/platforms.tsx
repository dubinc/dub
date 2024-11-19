import {
  Airtm,
  CashApp,
  Globe,
  GreekTemple,
  Payoneer,
  Paypal,
  Venmo,
} from "@dub/ui/src/icons";

export const DOTS_PAYOUT_PLATFORMS = [
  {
    id: "ach",
    name: "ACH",
    icon: GreekTemple,
    iconBgColor: "bg-neutral-100",
    duration: "in 2-3 business days",
  },
  {
    id: "paypal",
    name: "PayPal",
    icon: Paypal,
    iconBgColor: "bg-blue-100",
    duration: "instantly",
  },
  {
    id: "venmo",
    name: "Venmo",
    icon: Venmo,
    iconBgColor: "bg-[#CCE8FF]",
    duration: "instantly",
  },
  {
    id: "cash_app",
    name: "Cash App",
    icon: CashApp,
    iconBgColor: "bg-[#E5FBED]",
    duration: "instantly",
  },
  {
    id: "intl_bank",
    name: "International Bank",
    icon: GreekTemple,
    iconBgColor: "bg-neutral-100",
    duration: "in 2-3 business days",
  },
  {
    id: "intl_transfer",
    name: "International Transfer",
    icon: Globe,
    iconBgColor: "bg-neutral-100",
    duration: "in 2-3 business days",
  },
  {
    id: "airtm",
    name: "Airtm",
    icon: Airtm,
    iconBgColor: "bg-neutral-100",
    duration: "in 2-3 business days",
  },
  {
    id: "payoneer",
    name: "Payoneer",
    icon: Payoneer,
    iconBgColor: "bg-neutral-100",
  },
];
