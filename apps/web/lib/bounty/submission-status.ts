import {
  CircleCheck,
  CircleDotted,
  CircleHalfDottedCheck,
  CircleHalfDottedClock,
  CircleXmark,
  Lock,
} from "@dub/ui/icons";

export const BOUNTY_SUBMISSION_STATUS_BADGES = {
  notSubmitted: {
    label: "Not submitted",
    variant: "neutral",
    icon: CircleDotted,
    iconClassName: "text-neutral-700",
  },
  notOpen: {
    label: "Not open",
    variant: "neutral",
    icon: Lock,
    iconClassName: "text-neutral-700",
  },
  draft: {
    label: "In progress",
    variant: "pending",
    icon: CircleHalfDottedCheck,
    iconClassName: "text-orange-600",
  },
  submitted: {
    label: "Submitted",
    variant: "new",
    icon: CircleHalfDottedClock,
    iconClassName: "text-blue-600",
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
