import { ReferralStatus } from "@dub/prisma/client";
import { CircleCheck, CircleHalfDottedClock, CircleXmark } from "@dub/ui/icons";

export const ReferralStatusBadges: Record<
  ReferralStatus,
  {
    label: string;
    variant: "new" | "success" | "pending" | "error" | "neutral";
    className: string;
    icon: typeof CircleCheck;
  }
> = {
  pending: {
    label: "New",
    variant: "new",
    className: "text-blue-600 bg-blue-100",
    icon: CircleHalfDottedClock,
  },
  qualified: {
    label: "Qualified",
    variant: "new",
    className: "text-purple-600 bg-purple-100",
    icon: CircleCheck,
  },
  unqualified: {
    label: "Unqualified",
    variant: "error",
    className: "text-red-600 bg-red-100",
    icon: CircleXmark,
  },
  closedWon: {
    label: "Closed won",
    variant: "success",
    className: "text-green-600 bg-green-100",
    icon: CircleCheck,
  },
  closedLost: {
    label: "Closed lost",
    variant: "error",
    className: "text-red-600 bg-red-100",
    icon: CircleXmark,
  },
};
