import {
  CircleCheck,
  CircleHalfDottedClock,
  CircleXmark,
  Duplicate,
  ShieldAlert,
} from "@dub/ui/icons";

export const SaleStatusBadges = {
  pending: {
    label: "Pending",
    variant: "pending",
    className: "text-orange-600 bg-orange-100",
    icon: CircleHalfDottedClock,
  },
  processed: {
    label: "Processed",
    variant: "new",
    className: "text-blue-600 bg-blue-100",
    icon: CircleHalfDottedClock,
  },
  paid: {
    label: "Paid",
    variant: "success",
    className: "text-green-600 bg-green-100",
    icon: CircleCheck,
  },
  fraud: {
    label: "Fraud",
    variant: "error",
    className: "text-red-600 bg-red-100",
    icon: ShieldAlert,
  },
  duplicate: {
    label: "Duplicate",
    variant: "error",
    className: "text-red-600 bg-red-100",
    icon: Duplicate,
  },
  refunded: {
    label: "Refunded",
    variant: "error",
    className: "text-red-600 bg-red-100",
    icon: CircleXmark,
  },
  canceled: {
    label: "Canceled",
    variant: "neutral",
    className: "text-gray-600 bg-gray-100",
    icon: CircleXmark,
  },
};
