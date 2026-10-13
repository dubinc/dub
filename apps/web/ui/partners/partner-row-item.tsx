import { isProductionEnvironment } from "@/lib/sandbox/environment";
import useProgram from "@/lib/swr/use-program";
import { EXTERNAL_PAYOUT_CONFIRMED_WEBHOOK_TRIGGER } from "@/lib/webhook/constants";
import {
  CircleArrowRight,
  CircleXmark,
  DynamicTooltipWrapper,
  GreekTemple,
  IsolatedCube,
} from "@dub/ui";
import { cn, formatDateTimeSmart } from "@dub/utils";
import { PartnerNetworkStatus, PartnerPayoutMethod } from "@prisma/client";
import Link from "next/link";
import { useParams } from "next/navigation";
import type { ReactNode } from "react";
import { MarkdownDescription } from "../shared/markdown-description";
import { PartnerRiskIndicator } from "./fraud-risks/partner-risk-indicator";
import { PartnerAvatar } from "./partner-avatar";
import { PartnerNetworkStatusBadge } from "./partner-network/partner-network-status-badge";
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
    tenantId?: string | null;
    networkStatus?: PartnerNetworkStatus | null;
    defaultPayoutMethod?: PartnerPayoutMethod | null;
    payoutsEnabledAt?: Date | null;
  };
}

const PAYOUT_STATUS_CONFIG = {
  external: {
    title: "External payouts enabled",
    description: `This program has [external payouts](https://dub.co/docs/partners/external-payouts) enabled, which means partners will receive payouts externally via the \`${EXTERNAL_PAYOUT_CONFIRMED_WEBHOOK_TRIGGER}\` webhook event.`,
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
    icon: CircleXmark,
    iconClassName: "border-red-300 bg-red-200 text-red-800",
    indicatorColor: "bg-red-500",
  },
  simulated: {
    title: "Payouts simulated",
    description:
      "This is a non-production program so payouts will be simulated and no real money will be transferred.",
    icon: IsolatedCube,
    iconClassName: "border-yellow-300 bg-yellow-200 text-yellow-800",
    indicatorColor: "bg-yellow-500",
  },
} as const;

function usePartnerPayoutStatus(partner: PartnerRowItemProps["partner"]) {
  const { program } = useProgram();

  const showPayoutsEnabled = "payoutsEnabledAt" in partner;
  let statusKey: keyof typeof PAYOUT_STATUS_CONFIG | null = null;

  if (showPayoutsEnabled && program) {
    if (
      program.payoutMode === "external" ||
      (program.payoutMode === "hybrid" &&
        partner.payoutsEnabledAt === null &&
        partner.tenantId !== null)
    ) {
      statusKey = "external";
    } else if (!isProductionEnvironment(program.environment)) {
      statusKey = "simulated";
    } else if (partner.payoutsEnabledAt) {
      statusKey = "enabled";
    } else {
      statusKey = "disabled";
    }
  }

  return {
    statusKey,
    showPayoutsEnabled,
    environment: program?.environment,
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
    <div className="max-w-sm">
      <div className="grid gap-2 p-2.5">
        <div className="flex items-center gap-2 text-sm font-medium">
          {title}
          <div className={cn(iconClassName, "rounded-md border p-0.5")}>
            <Icon className="size-3.5" />
          </div>
        </div>
        <MarkdownDescription className="text-sm text-neutral-500 [&_code]:rounded-md [&_code]:bg-neutral-100 [&_code]:px-1 [&_code]:py-0.5 [&_code]:font-mono">
          {description}
        </MarkdownDescription>
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
  const { statusKey, showPayoutsEnabled, environment } =
    usePartnerPayoutStatus(partner);

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

      <div className="flex min-w-0 items-center gap-1">
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

        {"networkStatus" in partner && partner.networkStatus && (
          <PartnerNetworkStatusBadge networkStatus={partner.networkStatus} />
        )}
      </div>

      {suffix}

      {showFraudIndicator && <PartnerRiskIndicator partnerId={partner.id} />}
    </div>
  );
}
