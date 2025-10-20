import { CircleHalfDottedClock, CirclePlay, PaperPlane, Pen2 } from "@dub/ui";

export const CAMPAIGN_STATUS_BADGES = {
  draft: {
    label: "Draft",
    variant: "neutral",
    icon: Pen2,
    iconClassName: "text-neutral-600",
  },
  active: {
    label: "Active",
    variant: "success",
    icon: CirclePlay,
    iconClassName: "text-green-600",
  },
  paused: {
    label: "Paused",
    variant: "warning",
    icon: CircleHalfDottedClock,
    iconClassName: "text-yellow-600",
  },
  sent: {
    label: "Sent",
    variant: "neutral",
    icon: PaperPlane,
    iconClassName: "text-neutral-600",
  },
  scheduled: {
    label: "Scheduled",
    variant: "neutral",
    icon: CircleHalfDottedClock,
    iconClassName: "text-neutral-600",
  },
} as const;
