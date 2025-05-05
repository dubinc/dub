import { LinkifyTooltipContent } from "@dub/ui";
import {
  CircleCheck,
  CircleHalfDottedClock,
  CircleXmark,
  Duplicate,
  ShieldAlert,
} from "@dub/ui/icons";
import { currencyFormatter } from "@dub/utils";

interface CommissionTooltipDataProps {
  holdingPeriodDays: number;
  minPayoutAmount: number;
  supportEmail: string;
}

export const CommissionStatusBadges = {
  pending: {
    label: "Pending",
    variant: "pending",
    className: "text-orange-600 bg-orange-100",
    icon: CircleHalfDottedClock,
    tooltip: (data: CommissionTooltipDataProps) =>
      `This commission is pending and will be eligible for payout after the program's ${data.holdingPeriodDays}-day holding period.`,
  },
  processed: {
    label: "Processed",
    variant: "new",
    className: "text-blue-600 bg-blue-100",
    icon: CircleHalfDottedClock,
    tooltip: (data: CommissionTooltipDataProps) =>
      `This commission has been processed and will be paid out once your payout total reaches the program's minimum payout amount of ${currencyFormatter(data.minPayoutAmount / 100)}.`,
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
      <LinkifyTooltipContent>
        This commission was flagged as fraudulent. Reach out to{" "}
        {data.supportEmail} if you believe this is incorrect.
      </LinkifyTooltipContent>
    ),
  },
  duplicate: {
    label: "Duplicate",
    variant: "error",
    className: "text-red-600 bg-red-100",
    icon: Duplicate,
    tooltip: (data: CommissionTooltipDataProps) => (
      <LinkifyTooltipContent>
        This commission was flagged as duplicate. Reach out to{" "}
        {data.supportEmail} if you believe this is incorrect.
      </LinkifyTooltipContent>
    ),
  },
  refunded: {
    label: "Refunded",
    variant: "error",
    className: "text-red-600 bg-red-100",
    icon: CircleXmark,
    tooltip: (data: CommissionTooltipDataProps) => (
      <LinkifyTooltipContent>
        This commission was refunded. Reach out to {data.supportEmail} if you
        believe this is incorrect.
      </LinkifyTooltipContent>
    ),
  },
  canceled: {
    label: "Canceled",
    variant: "neutral",
    className: "text-gray-600 bg-gray-100",
    icon: CircleXmark,
    tooltip: (data: CommissionTooltipDataProps) => (
      <LinkifyTooltipContent>
        This commission was canceled. Reach out to {data.supportEmail} if you
        believe this is incorrect.
      </LinkifyTooltipContent>
    ),
  },
  ineligible: {
    label: "Ineligible",
    variant: "neutral",
    className: "text-gray-600 bg-gray-100",
    icon: CircleXmark,
    tooltip: (data: CommissionTooltipDataProps) => (
      <LinkifyTooltipContent>
        This sale is ineligible for commission. Reach out to {data.supportEmail}{" "}
        if you believe this is incorrect.
      </LinkifyTooltipContent>
    ),
  },
};
