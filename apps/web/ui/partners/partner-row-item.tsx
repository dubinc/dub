import useProgram from "@/lib/swr/use-program";
import { CircleArrowRight, DynamicTooltipWrapper, GreekTemple } from "@dub/ui";
import { cn } from "@dub/utils";
import { OG_AVATAR_URL } from "@dub/utils/src/constants";
import { CircleMinus } from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";

interface PartnerRowItemProps {
  showPermalink?: boolean;
  partner: {
    id: string;
    name: string;
    image?: string | null;
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
      "This partner has payouts enabled, which means they will be able to receive payouts from this program.",
    icon: GreekTemple,
    iconClassName: "border-green-300 bg-green-200 text-green-800",
    indicatorColor: "bg-green-500",
  },
  disabled: {
    title: "Payouts disabled",
    description:
      "This partner does not have payouts enabled, which means they will not be able to receive any payouts from this program.",
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
}: {
  statusKey: keyof typeof PAYOUT_STATUS_CONFIG | null;
}) {
  if (!statusKey) return null;

  const {
    title,
    description,
    icon: Icon,
    iconClassName,
  } = PAYOUT_STATUS_CONFIG[statusKey];

  return (
    <div className="grid max-w-xs gap-2 p-4">
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
      <div className="text-pretty text-sm text-neutral-500">{description}</div>
    </div>
  );
}

export function PartnerRowItem({
  partner,
  showPermalink = true,
}: PartnerRowItemProps) {
  const { slug } = useParams();
  const { statusKey, showPayoutsEnabled } = usePartnerPayoutStatus(partner);

  const As = showPermalink ? Link : "div";

  return (
    <div className="flex items-center gap-2">
      <DynamicTooltipWrapper
        tooltipProps={{
          content: <PartnerPayoutStatusTooltip statusKey={statusKey} />,
        }}
      >
        <div className="relative shrink-0">
          <img
            src={partner.image || `${OG_AVATAR_URL}${partner.name}`}
            alt={partner.name}
            className="size-5 shrink-0 rounded-full"
          />
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
      <As
        href={`/${slug}/program/partners/${partner.id}`}
        {...(showPermalink && { target: "_blank" })}
        className={cn(
          "min-w-0 truncate",
          showPermalink && "cursor-alias decoration-dotted hover:underline",
        )}
        title={partner.name}
      >
        {partner.name}
      </As>
    </div>
  );
}
