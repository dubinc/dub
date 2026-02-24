"use client";

import type { PartnerPayoutMethodSetting } from "@/lib/types";
import { Badge } from "@dub/ui";
import { cn } from "@dub/utils";
import type { ComponentType } from "react";
import { ReactNode } from "react";
import { ConnectPayoutButton } from "./connect-payout-button";
import {
  PAYOUT_METHODS,
  type PayoutMethodFeature,
} from "./payout-method-config";

export { PAYOUT_METHODS };

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
  payoutMethods: PartnerPayoutMethodSetting[];
  variant?: "default" | "compact";
  actionFooter?: (setting: PartnerPayoutMethodSetting) => ReactNode;
  allowConnectWhenPayoutsEnabled?: boolean;
}) {
  const filteredMethods = PAYOUT_METHODS.filter((m) =>
    payoutMethods.some((s) => s.type === m.id),
  );

  const methodCount = filteredMethods.length;
  const isSingleOption = methodCount === 1;
  const isCompact = variantProp === "compact";

  const gridClassName = isSingleOption
    ? "w-full"
    : methodCount === 2
      ? "grid gap-3 sm:grid-cols-2"
      : "grid gap-3 sm:grid-cols-3";

  const cardVariant = isCompact
    ? "compact"
    : isSingleOption
      ? "spotlight"
      : "default";

  const iconSize = isCompact ? "sm" : isSingleOption ? "lg" : "sm";

  return (
    <div className={gridClassName}>
      {filteredMethods.map((method) => {
        const setting = payoutMethods.find((s) => s.type === method.id)!;
        return (
          <PayoutMethodCard
            key={method.id}
            icon={
              <PayoutMethodIcon
                icon={method.icon}
                wrapperClasses={method.iconWrapperClass}
                size={iconSize}
              />
            }
            title={method.title}
            features={method.features}
            recommended={method.recommended}
            action={
              <ConnectPayoutButton
                payoutMethod={method.id}
                connected={setting.connected}
                className={cn(
                  "w-full rounded-lg",
                  isSingleOption ? "h-10" : "h-9",
                )}
                allowWhenPayoutsEnabled={allowConnectWhenPayoutsEnabled}
              />
            }
            actionFooter={actionFooter?.(setting)}
            variant={cardVariant}
          />
        );
      })}
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
  features: readonly PayoutMethodFeature[];
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
          {features.map(({ icon: FeatureIcon, text }) => (
            <li key={text} className="flex items-center gap-2">
              <span
                className={cn(
                  "flex shrink-0 items-center justify-center text-neutral-500",
                  styles.featureIcon,
                )}
              >
                <FeatureIcon />
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
