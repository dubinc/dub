import {
  BoxArchive,
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
    variant: "amber",
    className: "text-amber-600 bg-amber-100",
    icon: EnvelopeAlert,
  },
  deactivated: {
    label: "Deactivated",
    variant: "neutral",
    className: "text-neutral-500 bg-neutral-100",
    icon: CircleXmark,
  },
  banned: {
    label: "Banned",
    variant: "error",
    className: "text-red-600 bg-red-100",
    icon: UserDelete,
  },
  archived: {
    label: "Archived",
    variant: "neutral",
    className: "text-neutral-500 bg-neutral-100",
    icon: BoxArchive,
  },
};

export const ProgramNetworkStatusBadges = {
  ...PartnerStatusBadges,
  approved: {
    ...PartnerStatusBadges.approved,
    label: "Enrolled",
  },
  pending: {
    ...PartnerStatusBadges.pending,
    label: "Applied",
  },
};
