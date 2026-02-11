"use client";

import usePartnerProfile from "@/lib/swr/use-partner-profile";
import {
  Badge,
  CircleDollar,
  GreekTemple,
  Paypal,
  StablecoinIcon,
} from "@dub/ui";
import { Calendar, Globe, MapPin, Zap } from "lucide-react";
import { ReactNode } from "react";
import { ConnectPayoutButton } from "./connect-payout-button";

// TODO:
// Combine icon and iconSingle

const PAYOUT_METHODS = [
  {
    id: "stablecoin" as const,
    title: "Stablecoin",
    recommended: true,
    icon: (
      <div className="flex size-10 items-center justify-center rounded-lg border border-[#1717170D] bg-[#EDE9FE]">
        <StablecoinIcon className="size-5" />
      </div>
    ),
    iconSingle: (
      <div className="flex size-14 items-center justify-center rounded-lg border border-[#1717170D] bg-[#EDE9FE]">
        <StablecoinIcon className="size-8" />
      </div>
    ),
    features: [
      { icon: <CircleDollar />, text: "Paid in USDC" },
      { icon: <Globe />, text: "No local bank required" },
      { icon: <Zap />, text: "Payouts deposited instantly" },
    ],
  },
  {
    id: "connect" as const,
    title: "Bank Account",
    recommended: false,
    icon: (
      <div className="flex size-10 items-center justify-center rounded-lg border border-[#1717171A] bg-white">
        <GreekTemple className="text-content-emphasis size-5" />
      </div>
    ),
    iconSingle: (
      <div className="flex size-14 items-center justify-center rounded-lg border border-[#1717171A] bg-white">
        <GreekTemple className="text-content-emphasis size-8" />
      </div>
    ),
    features: [
      { icon: <MapPin />, text: "Paid in local currency" },
      { icon: <GreekTemple />, text: "Local bank required" },
      { icon: <Calendar />, text: "Payouts deposited in days" },
    ],
  },
  {
    id: "paypal" as const,
    title: "PayPal",
    recommended: false,
    icon: (
      <div className="flex size-10 items-center justify-center rounded-lg border border-[#1717171A] bg-white p-2">
        <Paypal className="size-5" />
      </div>
    ),
    iconSingle: (
      <div className="flex size-14 items-center justify-center rounded-lg border border-[#1717171A] bg-white p-2">
        <Paypal className="size-8" />
      </div>
    ),
    features: [
      { icon: <MapPin />, text: "Paid in local currency" },
      { icon: <GreekTemple />, text: "May require a linked bank" },
      { icon: <Zap />, text: "Payouts deposited instantly" },
    ],
  },
] as const;

function PayoutMethodCard({
  icon,
  title,
  features,
  recommended,
  action,
  isSingle,
}: {
  icon: ReactNode;
  title: string;
  features: readonly { icon: ReactNode; text: string }[];
  recommended?: boolean;
  action: ReactNode;
  isSingle?: boolean;
}) {
  return (
    <div
      className={`relative flex flex-col rounded-xl border border-neutral-200 bg-neutral-100 ${isSingle ? "p-8" : "p-4"} `}
    >
      {recommended && (
        <Badge
          variant="green"
          className="absolute right-3 top-3 rounded-md font-semibold text-green-700"
        >
          Recommended
        </Badge>
      )}

      <div
        className={`flex flex-col text-left ${isSingle ? "gap-4" : "gap-2"}`}
      >
        <div>{icon}</div>
        <h3
          className={
            isSingle
              ? "text-xl font-semibold text-neutral-900"
              : "text-sm font-semibold text-neutral-900"
          }
        >
          {title}
        </h3>

        <ul
          className={`flex-1 font-medium text-neutral-600 ${
            isSingle ? "space-y-3.5 text-sm" : "space-y-2.5 text-xs"
          }`}
        >
          {features.map(({ icon: featureIcon, text }) => (
            <li key={text} className="flex items-center gap-2">
              <span
                className={`flex shrink-0 items-center justify-center text-neutral-500 [&>svg]:size-4 ${
                  isSingle ? "[&>svg]:size-5" : ""
                }`}
              >
                {featureIcon}
              </span>
              {text}
            </li>
          ))}
        </ul>

        <div className={isSingle ? "mt-6" : "mt-4"}>{action}</div>
      </div>
    </div>
  );
}

export function PayoutMethodSelector() {
  const { availablePayoutMethods } = usePartnerProfile();

  const filteredMethods = PAYOUT_METHODS.filter((m) =>
    availablePayoutMethods.includes(m.id),
  );

  const isSingleOption = filteredMethods.length === 1;

  return (
    <div className={isSingleOption ? "w-full" : "grid gap-3 sm:grid-cols-2"}>
      {filteredMethods.map((method) => (
        <PayoutMethodCard
          key={method.id}
          icon={isSingleOption ? method.iconSingle : method.icon}
          title={method.title}
          features={method.features}
          recommended={method.recommended}
          action={
            <ConnectPayoutButton
              payoutMethod={method.id}
              text="Connect"
              className="h-9 w-full rounded-lg"
            />
          }
          isSingle={isSingleOption}
        />
      ))}
    </div>
  );
}
