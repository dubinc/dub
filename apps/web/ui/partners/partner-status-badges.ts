import {
  CircleCheck,
  CircleHalfDottedClock,
  CircleXmark,
  EnvelopeAlert,
  EnvelopeArrowRight,
  UserDelete,
} from "@dub/ui/icons";

export const PartnerStatusBadges = {
  pending: {
    label: "Pending",
    variant: "pending",
    className: "text-orange-600 bg-orange-100",
    icon: CircleHalfDottedClock,
  },
  approved: {
    label: "Approved",
    variant: "success",
    className: "text-green-600 bg-green-100",
    icon: CircleCheck,
  },
  rejected: {
    label: "Rejected",
    variant: "error",
    className: "text-red-600 bg-red-100",
    icon: CircleXmark,
  },
  invited: {
    label: "Invited",
    variant: "new",
    className: "text-blue-600 bg-blue-100",
    icon: EnvelopeArrowRight,
  },
  declined: {
    label: "Declined",
    variant: "error",
    className: "text-gray-600 bg-gray-100",
    icon: EnvelopeAlert,
  },
  banned: {
    label: "Banned",
    variant: "error",
    className: "text-red-600 bg-red-100",
    icon: UserDelete,
  },
};
