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
    className: "bg-blue-100 text-blue-600",
    icon: CircleHalfDottedClock,
  },
  qualified: {
    label: "Qualified",
    variant: "new",
    className: "bg-[#EDE8FD] text-[#7B3AFF]",
    icon: CircleCheck,
  },
  meeting: {
    label: "Meeting",
    variant: "pending",
    className: "bg-[#FFF3EC] text-[#FF4D00]",
    icon: CircleCheck,
  },
  negotiation: {
    label: "Negotiation",
    variant: "neutral",
    className: "bg-[#F5EDFF] text-[#CE00FF]",
    icon: CircleCheck,
  },
  unqualified: {
    label: "Unqualified",
    variant: "error",
    className: "bg-red-100 text-red-600",
    icon: CircleXmark,
  },
  closedWon: {
    label: "Closed won",
    variant: "success",
    className: "bg-green-100 text-green-600",
    icon: CircleCheck,
  },
  closedLost: {
    label: "Closed lost",
    variant: "error",
    className: "bg-[#FFEBEB] text-[#D60000]",
    icon: CircleXmark,
  },
};
