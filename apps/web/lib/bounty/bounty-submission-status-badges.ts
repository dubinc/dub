import {
  CircleCheck,
  CircleDotted,
  CircleHalfDottedCheck,
  CircleHalfDottedClock,
  CircleXmark,
  Lock,
} from "@dub/ui/icons";
import { BountySubmissionStatus } from "@prisma/client";

export const BountySubmissionStatusBadges = {
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
    icon: CircleHalfDottedClock,
    iconClassName: "text-orange-600",
  },
  submitted: {
    label: "Submitted",
    variant: "new",
    icon: CircleHalfDottedCheck,
    iconClassName: "text-blue-600",
  },
  partiallyApproved: {
    label: "Partially approved",
    variant: "success",
    icon: CircleHalfDottedCheck,
    iconClassName: "text-green-600",
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

// Partners see partially approved submissions the same as submitted ones, as "Pending review"
export function getPartnerSubmissionStatusBadge(
  status: keyof typeof BountySubmissionStatusBadges,
) {
  if (
    status === BountySubmissionStatus.submitted ||
    status === BountySubmissionStatus.partiallyApproved
  ) {
    return {
      ...BountySubmissionStatusBadges.submitted,
      label: "Pending review",
    };
  }

  return BountySubmissionStatusBadges[status];
}
