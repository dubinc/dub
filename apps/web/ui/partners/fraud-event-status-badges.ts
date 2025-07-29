import { CircleCheck, CircleHalfDottedClock, UserDelete } from "@dub/ui/icons";

export const FraudEventStatusBadges = {
  pending: {
    label: "Pending",
    variant: "pending",
    className: "text-orange-600 bg-orange-100",
    icon: CircleHalfDottedClock,
  },
  safe: {
    label: "Safe",
    variant: "success",
    className: "text-green-600 bg-green-100",
    icon: CircleCheck,
  },
  banned: {
    label: "Banned",
    variant: "error",
    className: "text-red-600 bg-red-100",
    icon: UserDelete,
  },
};
