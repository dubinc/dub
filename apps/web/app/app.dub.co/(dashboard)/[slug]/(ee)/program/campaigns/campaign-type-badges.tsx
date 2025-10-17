import { Megaphone, Workflow } from "@dub/ui";

export const CAMPAIGN_TYPE_BADGES = {
  marketing: {
    label: "Marketing",
    icon: Megaphone,
    iconClassName: "text-green-600 bg-green-100",
  },
  transactional: {
    label: "Transactional",
    icon: Workflow,
    iconClassName: "text-blue-600 bg-blue-100",
  },
} as const;
