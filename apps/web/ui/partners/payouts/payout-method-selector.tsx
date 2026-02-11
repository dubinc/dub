"use client";

import {
  Badge,
  CircleDollar,
  GreekTemple,
  Paypal,
  StablecoinIcon,
} from "@dub/ui";
import { cn } from "@dub/utils";
import { Calendar, Globe, MapPin, Zap } from "lucide-react";
import { ComponentType, ReactNode } from "react";
import { ConnectPayoutButton } from "./connect-payout-button";

const PAYOUT_METHODS = [
  {
    id: "stablecoin" as const,
    title: "Stablecoin",
    recommended: true,
    icon: StablecoinIcon,
    iconWrapperClasses: "border-[#1717170D] bg-[#EDE9FE]",
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
    icon: GreekTemple,
    iconWrapperClasses: "border-[#1717171A] bg-white",
    iconClassName: "text-content-emphasis",
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
    icon: Paypal,
    iconWrapperClasses: "border-[#1717171A] bg-white p-2",
    features: [
      { icon: <MapPin />, text: "Paid in local currency" },
      { icon: <GreekTemple />, text: "May require a linked bank" },
      { icon: <Zap />, text: "Payouts deposited instantly" },
    ],
  },
] as const;

export function PayoutMethodSelector({
  payoutMethods,
}: {
  payoutMethods: string[];
}) {
  const filteredMethods = PAYOUT_METHODS.filter((m) =>
    payoutMethods.includes(m.id),
  );

  const isSingleOption = filteredMethods.length === 1;

  return (
    <div className={isSingleOption ? "w-full" : "grid gap-3 sm:grid-cols-2"}>
      {filteredMethods.map((method) => (
        <PayoutMethodCard
          key={method.id}
          icon={
            <PayoutMethodIcon
              icon={method.icon}
              wrapperClasses={method.iconWrapperClasses}
              size={isSingleOption ? "lg" : "sm"}
              iconClassName={
                "iconClassName" in method ? method.iconClassName : undefined
              }
            />
          }
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

function PayoutMethodIcon({
  icon: Icon,
  wrapperClasses,
  size = "sm",
  iconClassName,
}: {
  icon: ComponentType<{ className?: string }>;
  wrapperClasses: string;
  size?: "sm" | "lg";
  iconClassName?: string;
}) {
  const containerSize = size === "lg" ? "size-14" : "size-10";
  const iconSize = size === "lg" ? "size-8" : "size-5";

  return (
    <div
      className={cn(
        "flex items-center justify-center rounded-lg border",
        wrapperClasses,
        containerSize,
      )}
    >
      <Icon className={cn(iconSize, iconClassName)} />
    </div>
  );
}

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
      {recommended && !isSingle && (
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
