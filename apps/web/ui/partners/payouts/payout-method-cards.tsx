"use client";

import type { PartnerPayoutMethodSetting } from "@/lib/types";
import { Badge } from "@dub/ui";
import { cn } from "@dub/utils";
import type { ComponentType } from "react";
import { ReactNode } from "react";
import { ConnectPayoutButton } from "./connect-payout-button";
import {
  getPayoutMethodFeaturesForSelector,
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
}: {
  payoutMethods: PartnerPayoutMethodSetting[];
  variant?: "default" | "compact";
  actionFooter?: (setting: PartnerPayoutMethodSetting) => ReactNode;
}) {
  const filteredMethods = PAYOUT_METHODS.filter((m) =>
    payoutMethods.some((s) => s.type === m.id),
  );

  const methodCount = filteredMethods.length;
  const isSingleOption = methodCount === 1;
  const isCompact = variantProp === "compact";

  const cardVariant = isCompact ? "compact" : "default";

  return (
    <div
      className={cn(
        methodCount === 2
          ? "grid gap-3 sm:grid-cols-2"
          : methodCount === 3
            ? "grid gap-3 sm:grid-cols-3"
            : "",
        // for onboarding payouts page, if single option, limit width to max-w-sm
        isSingleOption && !isCompact && "mx-auto w-full max-w-sm",
      )}
    >
      {filteredMethods.map((method) => {
        const setting = payoutMethods.find((s) => s.type === method.id)!;
        return (
          <PayoutMethodCard
            key={method.id}
            icon={
              <PayoutMethodIcon
                icon={method.icon}
                wrapperClasses={method.iconWrapperClass}
                size="sm"
              />
            }
            title={method.title}
            features={getPayoutMethodFeaturesForSelector(
              method.id,
              isSingleOption,
            )}
            recommended={method.recommended}
            action={
              <ConnectPayoutButton
                payoutMethod={method.id}
                connected={setting.connected}
                className="h-9 w-full rounded-lg"
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
