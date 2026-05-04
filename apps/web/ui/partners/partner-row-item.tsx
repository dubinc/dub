import useProgram from "@/lib/swr/use-program";
import { PartnerPayoutMethod } from "@dub/prisma/client";
import { CircleArrowRight, DynamicTooltipWrapper, GreekTemple } from "@dub/ui";
import { cn, formatDateTimeSmart } from "@dub/utils";
import { CircleMinus } from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";
import type { ReactNode } from "react";
import { PartnerFraudIndicator } from "./fraud-risks/partner-fraud-indicator";
import { PartnerAvatar } from "./partner-avatar";
import {
  getPayoutMethodIconConfig,
  getPayoutMethodLabel,
} from "./payouts/payout-method-config";

interface PartnerRowItemProps {
  showPermalink?: boolean;
  showFraudIndicator?: boolean;
  suffix?: ReactNode;
  partner: {
    id: string;
    name: string;
    image?: string | null;
    defaultPayoutMethod?: PartnerPayoutMethod | null;
    payoutsEnabledAt?: Date | null;
  };
}

const PAYOUT_STATUS_CONFIG = {
  external: {
    title: "External payouts enabled",
    description: (
      <div className="text-sm text-neutral-700">
        This program has external payouts enabled, which means partners will
        receive payouts externally via the{" "}
        <code className="rounded-md bg-neutral-100 px-1 py-0.5 font-mono">
          payout.confirmed
        </code>{" "}
        <a
          href="/settings/webhooks"
          target="_blank"
          rel="noopener noreferrer"
          className="cursor-alias underline decoration-dotted underline-offset-2"
        >
          webhook event.
        </a>
      </div>
    ),
    icon: CircleArrowRight,
    iconClassName: "border-purple-300 bg-purple-200 text-purple-800",
    indicatorColor: "bg-purple-500",
  },
  enabled: {
    title: "Payouts enabled",
    description:
      "This partner has connected a payout method, which means they will be able to receive payouts.",
    icon: GreekTemple,
    iconClassName: "border-green-300 bg-green-200 text-green-800",
    indicatorColor: "bg-green-500",
  },
  disabled: {
    title: "Payouts disabled",
    description:
      "This partner has not connected a payout method yet, which means they won't be able to receive payouts.",
    icon: CircleMinus,
    iconClassName: "border-red-300 bg-red-200 text-red-800",
    indicatorColor: "bg-red-500",
  },
} as const;

function usePartnerPayoutStatus(partner: PartnerRowItemProps["partner"]) {
  const { program } = useProgram();

  const showPayoutsEnabled = "payoutsEnabledAt" in partner;

  const isExternalPayoutEnabled =
    showPayoutsEnabled &&
    (() => {
      switch (program?.payoutMode) {
        case "external":
          return true;
        case "hybrid":
          return partner.payoutsEnabledAt === null;
        case "internal":
          return false;
        default:
          return false;
      }
    })();

  const statusKey: keyof typeof PAYOUT_STATUS_CONFIG | null = showPayoutsEnabled
    ? isExternalPayoutEnabled
      ? "external"
      : partner.payoutsEnabledAt
        ? "enabled"
        : "disabled"
    : null;

  return {
    statusKey,
    showPayoutsEnabled,
  };
}

function PartnerPayoutStatusTooltip({
  statusKey,
  partner,
}: {
  statusKey: keyof typeof PAYOUT_STATUS_CONFIG | null;
  partner: PartnerRowItemProps["partner"];
}) {
  if (!statusKey) return null;

  const {
    title,
    description,
    icon: Icon,
    iconClassName,
  } = PAYOUT_STATUS_CONFIG[statusKey];

  const hasPayoutDetails =
    statusKey === "enabled" &&
    partner.payoutsEnabledAt &&
    partner.defaultPayoutMethod;

  const { Icon: MethodIcon, wrapperClass: methodWrapperClass } =
    hasPayoutDetails
      ? getPayoutMethodIconConfig(partner.defaultPayoutMethod!)
      : { Icon: GreekTemple, wrapperClass: "" };

  return (
    <div className="max-w-xs">
      <div className="grid gap-2 p-2.5">
        <div className="flex items-center gap-2 text-sm font-medium">
          {title}
          <div
            className={cn(
              iconClassName,
              "flex size-5 items-center justify-center rounded-md border",
            )}
          >
            <Icon className="size-3" />
          </div>
        </div>
        <div className="text-pretty text-sm text-neutral-500">
          {description}
        </div>
      </div>
      {hasPayoutDetails && (
        <div className="flex items-center gap-1.5 border-t border-neutral-100 p-2.5 text-xs text-neutral-600">
          <div
            className={cn(
              "flex size-5 shrink-0 items-center justify-center rounded-md border",
              methodWrapperClass,
            )}
          >
            <MethodIcon className="size-3" />
          </div>
          <span>
            {getPayoutMethodLabel(partner.defaultPayoutMethod!)} · Connected{" "}
            {formatDateTimeSmart(partner.payoutsEnabledAt!)}
          </span>
        </div>
      )}
    </div>
  );
}

export function PartnerRowItem({
  partner,
  showPermalink = true,
  showFraudIndicator = true,
  suffix,
}: PartnerRowItemProps) {
  const { slug } = useParams();
  const { statusKey, showPayoutsEnabled } = usePartnerPayoutStatus(partner);

  const As = showPermalink ? Link : "div";

  return (
    <div className="flex min-w-0 items-center gap-2">
      <div className="shrink-0">
        <DynamicTooltipWrapper
          tooltipProps={
            statusKey
              ? {
                  content: (
                    <PartnerPayoutStatusTooltip
                      statusKey={statusKey}
                      partner={partner}
                    />
                  ),
                }
              : undefined
          }
        >
          <div className="relative shrink-0">
            <PartnerAvatar partner={partner} className="size-5" />
            {showPayoutsEnabled && statusKey && (
              <div
                className={cn(
                  "absolute -bottom-0.5 -right-0.5 size-2 rounded-full",
                  PAYOUT_STATUS_CONFIG[statusKey].indicatorColor,
                )}
              />
            )}
          </div>
        </DynamicTooltipWrapper>
      </div>

      <As
        href={`/${slug}/program/partners/${partner.id}`}
        {...(showPermalink && { target: "_blank" })}
        onClick={showPermalink ? (e) => e.stopPropagation() : undefined}
        onAuxClick={showPermalink ? (e) => e.stopPropagation() : undefined}
        className={cn(
          "min-w-0 truncate",
          showPermalink && "cursor-alias decoration-dotted hover:underline",
        )}
        title={partner.name}
      >
        {partner.name}
      </As>

      {suffix}

      {showFraudIndicator && <PartnerFraudIndicator partnerId={partner.id} />}
    </div>
  );
}
