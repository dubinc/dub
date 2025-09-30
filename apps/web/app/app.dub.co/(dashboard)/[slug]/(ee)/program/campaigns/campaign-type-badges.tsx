import { Megaphone, Workflow } from "@dub/ui";

export const CampaignTypeBadges = {
  marketing: {
    label: "Marketing",
    icon: Megaphone,
    iconClassName: "text-green-600",
    className: "bg-green-100",
  },
  transactional: {
    label: "Transactional",
    icon: Workflow,
    iconClassName: "text-blue-600",
    className: "bg-blue-100",
  },
} as const;
