"use client";

import {
  Badge,
  CircleDollar,
  CircleDollar3,
  GreekTemple,
  Paypal,
} from "@dub/ui";
import { cn } from "@dub/utils";
import { Calendar, Globe, MapPin, Zap } from "lucide-react";
import { ComponentType, ReactNode } from "react";
import { ConnectPayoutButton } from "./connect-payout-button";

export const PAYOUT_METHODS = [
  {
    id: "stablecoin",
    title: "Stablecoin",
    recommended: true,
    icon: CircleDollar3,
    iconWrapperClasses: "border-[#1717170D] bg-blue-100",
    features: [
      { icon: <CircleDollar />, text: "Paid in USDC" },
      { icon: <Globe />, text: "No local bank required" },
      { icon: <Zap />, text: "Payouts deposited instantly" },
    ],
  },
  {
    id: "connect",
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
    id: "paypal",
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

const CARD_VARIANTS = {
  default: {
    card: "p-4",
    content: "gap-2",
    title: "text-sm font-semibold text-neutral-900",
    list: "space-y-2.5 text-xs",
    featureIcon: "[&>svg]:size-4",
    action: "mt-4",
  },
  compact: {
    card: "p-3",
    content: "gap-2",
    title: "text-sm font-semibold text-neutral-900",
    list: "space-y-2 text-xs",
    featureIcon: "[&>svg]:size-4",
    action: "mt-3",
  },
  spotlight: {
    card: "p-8",
    content: "gap-4",
    title: "text-xl font-semibold text-neutral-900",
    list: "space-y-3.5 text-sm",
    featureIcon: "[&>svg]:size-5",
    action: "mt-6",
  },
} as const;

export function PayoutMethodSelector({
  payoutMethods,
  variant: variantProp,
  actionFooter,
  allowConnectWhenPayoutsEnabled,
}: {
  payoutMethods: string[];
  variant?: "default" | "compact";
  actionFooter?: (methodId: string) => ReactNode;
  allowConnectWhenPayoutsEnabled?: boolean;
}) {
  const filteredMethods = PAYOUT_METHODS.filter((m) =>
    payoutMethods.includes(m.id),
  );

  const isSingleOption = filteredMethods.length === 1;
  const cardVariant =
    variantProp === "compact"
      ? "compact"
      : isSingleOption
        ? "spotlight"
        : "default";
  const iconSize =
    variantProp === "compact" ? "sm" : isSingleOption ? "lg" : "sm";

  return (
    <div className={isSingleOption ? "w-full" : "grid gap-3 sm:grid-cols-2"}>
      {filteredMethods.map((method) => (
        <PayoutMethodCard
          key={method.id}
          icon={
            <PayoutMethodIcon
              icon={method.icon}
              wrapperClasses={method.iconWrapperClasses}
              size={iconSize}
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
              allowWhenPayoutsEnabled={allowConnectWhenPayoutsEnabled}
            />
          }
          actionFooter={actionFooter?.(method.id)}
          variant={cardVariant}
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
  actionFooter,
  variant = "default",
}: {
  icon: ReactNode;
  title: string;
  features: readonly { icon: ReactNode; text: string }[];
  recommended?: boolean;
  action: ReactNode;
  actionFooter?: ReactNode;
  variant?: "default" | "compact" | "spotlight";
}) {
  const styles = CARD_VARIANTS[variant];

  return (
    <div
      className={cn(
        "relative flex flex-col rounded-xl border border-neutral-200 bg-neutral-100",
        styles.card,
      )}
    >
      {recommended && variant !== "spotlight" && (
        <Badge
          variant="green"
          className="absolute right-3 top-3 rounded-md font-semibold text-green-700"
        >
          Recommended
        </Badge>
      )}

      <div className={cn("flex flex-col text-left", styles.content)}>
        <div>{icon}</div>
        <h3 className={styles.title}>{title}</h3>

        <ul className={cn("flex-1 font-medium text-neutral-600", styles.list)}>
          {features.map(({ icon: featureIcon, text }) => (
            <li key={text} className="flex items-center gap-2">
              <span
                className={cn(
                  "flex shrink-0 items-center justify-center text-neutral-500",
                  styles.featureIcon,
                )}
              >
                {featureIcon}
              </span>
              {text}
            </li>
          ))}
        </ul>

        <div className={styles.action}>{action}</div>
        {actionFooter}
      </div>
    </div>
  );
}
