import { PartnerProps } from "@/lib/types";
import { Commission, PartnerGroup, Program } from "@dub/prisma/client";
import {
  CircleCheck,
  CircleHalfDottedClock,
  CircleXmark,
  Duplicate,
  ShieldAlert,
} from "@dub/ui/icons";
import {
  APP_DOMAIN,
  currencyFormatter,
  formatDateTimeSmart,
  PARTNERS_DOMAIN,
} from "@dub/utils";
import { addDays } from "date-fns";

interface CommissionTooltipDataProps {
  program?: Pick<Program, "name" | "slug" | "minPayoutAmount">;
  group?: Pick<PartnerGroup, "holdingPeriodDays"> & { slug?: string };
  workspace?: {
    slug?: string;
  };
  commission: Pick<Commission, "createdAt">;
  variant: "partner" | "workspace";
  partner?: Pick<PartnerProps, "id">;
}

export const CommissionStatusBadges = {
  pending: {
    label: "Pending",
    variant: "pending",
    className: "text-orange-600 bg-orange-100",
    icon: CircleHalfDottedClock,
    tooltip: (data: CommissionTooltipDataProps) =>
      data.variant === "partner"
        ? `This commission is pending and will be eligible for payout ${data.group?.holdingPeriodDays ? `on \`${formatDateTimeSmart(addDays(data.commission.createdAt, data.group.holdingPeriodDays))}\` (after the program's [${data.group.holdingPeriodDays}-day holding period](https://dub.co/help/article/commissions-payouts#what-does-holding-period-mean))` : "shortly"}.`
        : `This commission is pending and will be eligible for payout ${data.group?.holdingPeriodDays ? `on \`${formatDateTimeSmart(addDays(data.commission.createdAt, data.group.holdingPeriodDays))}\` (after the [payout holding period](https://dub.co/help/article/partner-payouts#payout-holding-period) for this [partner's group](${APP_DOMAIN}/${data.workspace?.slug}/program/groups/${data.group.slug || "default"}/settings))` : "shortly"}.`,
  },
  processed: {
    label: "Processed",
    variant: "new",
    className: "text-blue-600 bg-blue-100",
    icon: CircleHalfDottedClock,
    tooltip: (data: CommissionTooltipDataProps) => {
      const title = `This commission has been processed and ${data.variant === "partner" && data.program?.minPayoutAmount ? `will be paid out once your payout total reaches the program's minimum payout amount of ${currencyFormatter(data.program?.minPayoutAmount)}` : "is now eligible for payout"}.`;
      const cta =
        data.variant === "partner" ? "Learn more." : "View pending payouts.";
      const href =
        data.variant === "partner"
          ? "https://dub.co/help/article/commissions-payouts"
          : `/${data.workspace?.slug}/program/payouts?status=pending`;
      return `${title} [${cta}](${href})`;
    },
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
    tooltip: (data: CommissionTooltipDataProps) => {
      const title = `This commission was flagged as fraudulent.${data.variant === "partner" ? " If you believe this is incorrect, " : ""}`;
      if (
        data.variant === "partner" &&
        data.program?.name &&
        data.program?.slug
      ) {
        return `${title}[reach out to the ${data.program.name} team](${PARTNERS_DOMAIN}/messages/${data.program.slug})`;
      }
      return title;
    },
  },
  duplicate: {
    label: "Duplicate",
    variant: "error",
    className: "text-red-600 bg-red-100",
    icon: Duplicate,
    tooltip: (data: CommissionTooltipDataProps) => {
      const title = `This commission was flagged as duplicate.${data.variant === "partner" ? " If you believe this is incorrect, " : ""}`;
      if (
        data.variant === "partner" &&
        data.program?.name &&
        data.program?.slug
      ) {
        return `${title}[reach out to the ${data.program.name} team](${PARTNERS_DOMAIN}/messages/${data.program.slug})`;
      }
      return title;
    },
  },
  refunded: {
    label: "Refunded",
    variant: "error",
    className: "text-red-600 bg-red-100",
    icon: CircleXmark,
    tooltip: (data: CommissionTooltipDataProps) => {
      const title = `This commission was refunded.${data.variant === "partner" ? " If you believe this is incorrect, " : ""}`;
      if (
        data.variant === "partner" &&
        data.program?.name &&
        data.program?.slug
      ) {
        return `${title}[reach out to the ${data.program.name} team](${PARTNERS_DOMAIN}/messages/${data.program.slug})`;
      }
      return title;
    },
  },
  canceled: {
    label: "Canceled",
    variant: "neutral",
    className: "text-gray-600 bg-gray-100",
    icon: CircleXmark,
    tooltip: (data: CommissionTooltipDataProps) => {
      const title = `This commission was canceled.${data.variant === "partner" ? " If you believe this is incorrect, " : ""}`;
      if (
        data.variant === "partner" &&
        data.program?.name &&
        data.program?.slug
      ) {
        return `${title}[reach out to the ${data.program.name} team](${PARTNERS_DOMAIN}/messages/${data.program.slug})`;
      }
      return title;
    },
  },
  hold: {
    label: "On Hold",
    variant: "error",
    className: "text-red-600 bg-red-100",
    icon: CircleXmark,
    tooltip: (data: CommissionTooltipDataProps) => {
      if (data.variant === "partner") {
        const title =
          "This commission is on hold due to pending fraud events and cannot be paid out until they are resolved.";

        if (data.program?.name && data.program?.slug) {
          return `${title} If you believe this is incorrect, [reach out to the ${data.program.name} team](${PARTNERS_DOMAIN}/messages/${data.program.slug}).`;
        }

        return title;
      }

      const linkToFraudEvents = data.partner?.id
        ? `/${data.workspace?.slug}/program/fraud?partnerId=${data.partner.id}`
        : `/${data.workspace?.slug}/program/fraud`;

      return `This partner's commissions are on hold due to [unresolved fraud events](${linkToFraudEvents}). They cannot be paid out until resolved.`;
    },
  },
};
