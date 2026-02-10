"use client";

import {
  Badge,
  CircleDollar,
  GreekTemple,
  StripeStablecoinIcon,
} from "@dub/ui";
import { Calendar, Globe, MapPin, Zap } from "lucide-react";
import { ReactNode } from "react";
import { ConnectPayoutButton } from "./connect-payout-button";

const STRIPE_PAYOUT_METHODS = [
  {
    id: "stablecoin" as const,
    title: "Stablecoin",
    recommended: true,
    icon: (
      <div className="flex size-10 items-center justify-center rounded-lg border border-[#1717170D] bg-[#EDE9FE]">
        <StripeStablecoinIcon className="size-5" />
      </div>
    ),
    features: [
      { icon: <CircleDollar />, text: "Paid in USDC" },
      { icon: <Globe />, text: "Accepted worldwide" },
      { icon: <Zap />, text: "Payouts deposited instantly" },
    ],
  },
  {
    id: "bank_account" as const,
    title: "Bank Account",
    recommended: false,
    icon: (
      <div className="flex size-10 items-center justify-center rounded-lg border border-[#1717171A] bg-white">
        <GreekTemple className="text-content-emphasis size-5" />
      </div>
    ),
    features: [
      { icon: <MapPin />, text: "Paid in local currency" },
      { icon: <GreekTemple />, text: "Local bank required" },
      { icon: <Calendar />, text: "Payouts deposited in days" },
    ],
  },
] as const;

function PayoutMethodCard({
  icon,
  title,
  features,
  recommended,
  action,
}: {
  icon: ReactNode;
  title: string;
  features: readonly { icon: ReactNode; text: string }[];
  recommended?: boolean;
  action: ReactNode;
}) {
  return (
    <div className="relative flex flex-col rounded-xl border border-neutral-200 bg-neutral-100 p-4">
      {recommended && (
        <Badge
          variant="green"
          className="absolute right-3 top-3 rounded-md font-semibold text-green-700"
        >
          Recommended
        </Badge>
      )}

      <div className="flex flex-col gap-2 text-left">
        <div>{icon}</div>
        <h3 className="text-sm font-semibold text-neutral-900">{title}</h3>

        <ul className="flex-1 space-y-2.5 text-xs font-medium text-neutral-600">
          {features.map(({ icon: featureIcon, text }) => (
            <li key={text} className="flex items-center gap-2">
              <span className="flex size-4 shrink-0 items-center justify-center text-neutral-500 [&>svg]:size-4">
                {featureIcon}
              </span>
              {text}
            </li>
          ))}
        </ul>

        <div className="mt-4">{action}</div>
      </div>
    </div>
  );
}

export function StripePayoutMethodOptions() {
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      {STRIPE_PAYOUT_METHODS.map((method) => (
        <PayoutMethodCard
          key={method.id}
          icon={method.icon}
          title={method.title}
          features={method.features}
          recommended={method.recommended}
          action={
            <ConnectPayoutButton
              text="Connect"
              className="h-9 w-full rounded-lg"
              payoutMethodType={method.id}
            />
          }
        />
      ))}
    </div>
  );
}

export type StripePayoutMethodType =
  (typeof STRIPE_PAYOUT_METHODS)[number]["id"];
