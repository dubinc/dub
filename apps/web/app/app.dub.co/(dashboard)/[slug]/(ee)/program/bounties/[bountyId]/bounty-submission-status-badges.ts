import { CircleCheck, CircleHalfDottedCheck, CircleXmark } from "@dub/ui/icons";

export const BOUNTY_SUBMISSION_STATUS_BADGES = {
  pending: {
    label: "Pending",
    variant: "pending",
    icon: CircleHalfDottedCheck,
    iconClassName: "text-orange-600",
  },
  approved: {
    label: "Approved",
    variant: "success",
    icon: CircleCheck,
    iconClassName: "text-green-600",
  },
  rejected: {
    label: "Rejected",
    variant: "error",
    icon: CircleXmark,
    iconClassName: "text-red-600",
  },
} as const;
