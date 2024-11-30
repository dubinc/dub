import {
  CircleCheck,
  CircleHalfDottedClock,
  CircleWarning,
} from "@dub/ui/src/icons";

export const PayoutStatusBadges = {
  pending: {
    label: "Pending",
    variant: "pending",
    icon: CircleHalfDottedClock,
    className: "text-orange-600 bg-orange-100",
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
};
