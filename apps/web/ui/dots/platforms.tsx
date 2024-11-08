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
    icon: <Venmo className="size-4" />,
    iconBgColor: "bg-[#CCE8FF]",
  },
  {
    id: "cash_app",
    name: "Cash App",
    icon: <CashApp className="size-4" />,
    iconBgColor: "bg-[#E5FBED]",
  },
  {
    id: "intl_transfer",
    name: "International Transfer",
    icon: <Globe className="size-4" />,
    iconBgColor: "bg-neutral-100",
  },
  {
    id: "airtm",
    name: "Airtm",
    icon: <Airtm className="size-4" />,
    iconBgColor: "bg-neutral-100",
  },
  {
    id: "payoneer",
    name: "Payoneer",
    icon: <Payoneer className="size-4" />,
    iconBgColor: "bg-neutral-100",
  },
];
