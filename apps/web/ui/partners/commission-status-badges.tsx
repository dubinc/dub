import { Program } from "@dub/prisma/client";
import { SimpleTooltipContent } from "@dub/ui";
import {
  CircleCheck,
  CircleHalfDottedClock,
  CircleXmark,
  Duplicate,
  ShieldAlert,
} from "@dub/ui/icons";
import { currencyFormatter, PARTNERS_DOMAIN } from "@dub/utils";

interface CommissionTooltipDataProps {
  program?: Pick<
    Program,
    "name" | "slug" | "holdingPeriodDays" | "minPayoutAmount"
  >;
  workspace?: {
    slug?: string;
  };
  variant: "partner" | "workspace";
}

export const CommissionStatusBadges = {
  pending: {
    label: "Pending",
    variant: "pending",
    className: "text-orange-600 bg-orange-100",
    icon: CircleHalfDottedClock,
    tooltip: (data: CommissionTooltipDataProps) => (
      <SimpleTooltipContent
        title={`This commission is pending and will be eligible for payout after ${data.variant === "partner" ? "the" : "your"} program's ${data.program?.holdingPeriodDays}-day holding period.`}
        cta="Learn more."
        href="https://dub.co/help/article/commissions-payouts"
      />
    ),
  },
  processed: {
    label: "Processed",
    variant: "new",
    className: "text-blue-600 bg-blue-100",
    icon: CircleHalfDottedClock,
    tooltip: (data: CommissionTooltipDataProps) => (
      <SimpleTooltipContent
        title={`This commission has been processed and ${data.variant === "partner" && data.program?.minPayoutAmount ? `will be paid out once your payout total reaches the program's minimum payout amount of ${currencyFormatter(data.program?.minPayoutAmount / 100)}` : "is now eligible for payout"}.`}
        cta={
          data.variant === "partner" ? "Learn more." : "View pending payouts."
        }
        href={
          data.variant === "partner"
            ? "https://dub.co/help/article/commissions-payouts"
            : `/${data.workspace?.slug}/program/payouts?status=pending&sortBy=amount`
        }
      />
    ),
  },
  paid: {
    label: "Paid",
    variant: "success",
    className: "text-green-600 bg-green-100",
    icon: CircleCheck,
    tooltip: (_: CommissionTooltipDataProps) => null,
  },
  fraud: {
    label: "Fraud",
    variant: "error",
    className: "text-red-600 bg-red-100",
    icon: ShieldAlert,
    tooltip: (data: CommissionTooltipDataProps) => (
      <SimpleTooltipContent
        title={`This commission was flagged as fraudulent.${data.variant === "partner" ? " If you believe this is incorrect, " : ""}`}
        cta={
          data.variant === "partner"
            ? `reach out to the ${data.program?.name} team`
            : undefined
        }
        href={
          data.variant === "partner"
            ? `${PARTNERS_DOMAIN}/messages/${data.program?.slug}`
            : undefined
        }
      />
    ),
  },
  duplicate: {
    label: "Duplicate",
    variant: "error",
    className: "text-red-600 bg-red-100",
    icon: Duplicate,
    tooltip: (data: CommissionTooltipDataProps) => (
      <SimpleTooltipContent
        title={`This commission was flagged as duplicate.${data.variant === "partner" ? " If you believe this is incorrect, " : ""}`}
        cta={
          data.variant === "partner"
            ? `reach out to the ${data.program?.name} team`
            : undefined
        }
        href={
          data.variant === "partner"
            ? `${PARTNERS_DOMAIN}/messages/${data.program?.slug}`
            : undefined
        }
      />
    ),
  },
  refunded: {
    label: "Refunded",
    variant: "error",
    className: "text-red-600 bg-red-100",
    icon: CircleXmark,
    tooltip: (data: CommissionTooltipDataProps) => (
      <SimpleTooltipContent
        title={`This commission was refunded.${data.variant === "partner" ? " If you believe this is incorrect, " : ""}`}
        cta={
          data.variant === "partner"
            ? `reach out to the ${data.program?.name} team`
            : undefined
        }
        href={
          data.variant === "partner"
            ? `${PARTNERS_DOMAIN}/messages/${data.program?.slug}`
            : undefined
        }
      />
    ),
  },
  canceled: {
    label: "Canceled",
    variant: "neutral",
    className: "text-gray-600 bg-gray-100",
    icon: CircleXmark,
    tooltip: (data: CommissionTooltipDataProps) => (
      <SimpleTooltipContent
        title={`This commission was canceled.${data.variant === "partner" ? " If you believe this is incorrect, " : ""}`}
        cta={
          data.variant === "partner"
            ? `reach out to the ${data.program?.name} team`
            : undefined
        }
        href={
          data.variant === "partner"
            ? `${PARTNERS_DOMAIN}/messages/${data.program?.slug}`
            : undefined
        }
      />
    ),
  },
};
