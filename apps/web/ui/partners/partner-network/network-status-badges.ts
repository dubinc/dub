import {
  CircleCheck,
  CircleHalfDottedCheck,
  CircleHalfDottedClock,
  CircleXmark,
  UserXmark,
} from "@dub/ui/icons";

export const NetworkStatusBadges = {
  draft: {
    partnerTooltip: {
      content:
        "Submit your application to join the Dub Partner Network. After approval, you can then apply to this program.",
      cta: "Submit application",
    },
    label: "Draft",
    variant: "pending",
    className: "bg-bg-attention text-content-attention",
    icon: CircleHalfDottedClock,
  },
  submitted: {
    partnerTooltip: {
      content:
        "Your Dub Partner Network application is under review. You'll be able to apply to this program once approved.",
      cta: "Pending approval",
      ctaClassName: "bg-bg-attention text-content-attention",
    },
    label: "Submitted",
    variant: "new",
    className: "bg-bg-info text-content-info",
    icon: CircleHalfDottedCheck,
  },
  rejected: {
    partnerTooltip: {
      content:
        "Your Dub Partner Network application was not approved. You are not eligible to apply to this program.",
      cta: "Rejected",
    },
    label: "Rejected",
    variant: "error",
    className: "bg-bg-error text-content-error",
    icon: CircleXmark,
  },
  banned: {
    partnerTooltip: {
      content:
        "Your partner account is banned. You are not eligible to apply to this program.",
      cta: "Banned",
    },
    label: "Banned",
    variant: "error",
    className: "bg-bg-error text-content-error",
    icon: UserXmark,
  },
  // not show in partner tooltip
  approved: {
    label: "Approved",
    variant: "success",
    className: "bg-bg-success text-content-success",
    icon: CircleCheck,
  },
  trusted: {
    label: "Trusted",
    variant: "success",
    className: "bg-bg-success text-content-success",
    icon: CircleCheck,
  },
};
