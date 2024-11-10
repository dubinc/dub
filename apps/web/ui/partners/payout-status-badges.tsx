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
  // created: {
  //   label: "Created",
  //   variant: "new",
  //   icon: CircleHalfDottedCheck,
  //   className: "text-gray-600 bg-gray-100",
  // },
  // reversed: {
  //   label: "Reversed",
  //   variant: "error",
  //   icon: CircleHalfDottedClock,
  //   className: "text-red-600 bg-red-100",
  // },
  // canceled: {
  //   label: "Canceled",
  //   variant: "error",
  //   icon: CircleXmark,
  //   className: "text-red-600 bg-red-100",
  // },
  // flagged: {
  //   label: "Flagged",
  //   variant: "warning",
  //   icon: CircleWarning,
  //   className: "text-yellow-600 bg-yellow-100",
  // },
};
