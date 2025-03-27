import {
  CircleCheck,
  CircleHalfDottedClock,
  CircleWarning,
  CircleXmark,
} from "@dub/ui/icons";

export const PayoutStatusBadges = {
  pending: {
    label: "Pending",
    variant: "pending",
    icon: CircleHalfDottedClock,
    className: "text-orange-600 bg-orange-100",
  },
  processing: {
    label: "Processing",
    variant: "new",
    icon: CircleHalfDottedClock,
    className: "text-blue-600 bg-blue-100",
  },
  completed: {
    label: "Completed",
    variant: "success",
    icon: CircleCheck,
    className: "text-green-600 bg-green-100",
  },
  failed: {
    label: "Failed",
    variant: "error",
    icon: CircleWarning,
    className: "text-red-600 bg-red-100",
  },
  canceled: {
    label: "Canceled",
    variant: "neutral",
    icon: CircleXmark,
    className: "text-gray-600 bg-gray-100",
  },
};
