import {
  CircleCheck,
  CircleHalfDottedClock,
  CircleXmark,
  EnvelopeArrowRight,
  UserDelete,
} from "@dub/ui/icons";

export const PartnerStatusBadges = {
  invited: {
    label: "Invited",
    variant: "pending",
    className: "text-orange-600 bg-orange-100",
    icon: EnvelopeArrowRight,
  },
  approved: {
    label: "Approved",
    variant: "success",
    className: "text-green-600 bg-green-100",
    icon: CircleCheck,
  },
  pending: {
    label: "Pending",
    variant: "pending",
    className: "text-orange-600 bg-orange-100",
    icon: CircleHalfDottedClock,
  },
  rejected: {
    label: "Rejected",
    variant: "error",
    className: "text-red-600 bg-red-100",
    icon: CircleXmark,
  },
  banned: {
    label: "Banned",
    variant: "error",
    className: "text-red-600 bg-red-100",
    icon: UserDelete,
  },
};
