import { LinkFormData } from "@/ui/links/link-builder/link-builder-provider";
import { getABTestingLabel } from "@/ui/modals/link-builder/ab-testing-modal";
import { getExpirationLabel } from "@/ui/modals/link-builder/expiration-modal";
import { getPasswordLabel } from "@/ui/modals/link-builder/password-modal";
import { getTargetingLabel } from "@/ui/modals/link-builder/targeting-modal";
import {
  CircleHalfDottedClock,
  Crosshairs3,
  Flask,
  Icon,
  Incognito,
  InputPassword,
  WindowSearch,
} from "@dub/ui/icons";
import { Settings, User2 } from "lucide-react";

type MoreItem = {
  key: string;
  icon: Icon;
  label: string;
  description?: string;
  learnMoreUrl?: string;
  shortcutKey: string;
  type: string;
  badgeLabel?: (data: LinkFormData) => string;
  enabled?: (data: LinkFormData) => boolean;
  add?: boolean;
};

export const MORE_ITEMS: MoreItem[] = [
  {
    key: "rewrite",
    icon: Incognito,
    label: "Link Cloaking",
    description:
      "Mask your destination URL so your users only see the short link in the browser address bar.",
    learnMoreUrl: "https://dub.co/help/article/link-cloaking",
    shortcutKey: "k",
    type: "boolean",
  },
  {
    key: "doIndex",
    icon: WindowSearch,
    label: "Search Engine Indexing",
    description:
      "Allow search engines to index your short link. Disabled by default.",
    learnMoreUrl: "https://dub.co/help/article/how-noindex-works",
    shortcutKey: "s",
    type: "boolean",
  },
  {
    key: "partnerId",
    icon: User2,
    label: "Assign to Partner",
    shortcutKey: "b",
    type: "modal",
    enabled: (data) => Boolean(data.partnerId),
    add: false,
    description: "Assign this link to a partner.",
    learnMoreUrl: "https://dub.co/help/article/dub-partners",
  },
  {
    key: "advanced",
    icon: Settings,
    label: "Advanced Settings",
    shortcutKey: "v",
    type: "modal",
    enabled: (data) => Boolean(data.externalId || data.tenantId),
    add: false,
  },
];

export const MOBILE_MORE_ITEMS: MoreItem[] = [
  {
    key: "expiresAt",
    icon: CircleHalfDottedClock,
    label: "Link Expiration",
    badgeLabel: getExpirationLabel,
    description:
      "Set an expiration date for your links – after which it won't be accessible.",
    learnMoreUrl: "https://dub.co/help/article/link-expiration",
    shortcutKey: "e",
    enabled: (data) => Boolean(data.expiresAt),
    type: "modal",
  },
  {
    key: "targeting",
    icon: Crosshairs3,
    label: "Targeting",
    badgeLabel: getTargetingLabel,
    description:
      "Target your links to specific audiences based on their location, device, or browser.",
    learnMoreUrl: "https://dub.co/help/article/geo-targeting",
    shortcutKey: "x",
    enabled: (data) =>
      Boolean(
        data.ios || data.android || Object.keys(data.geo || {}).length > 0,
      ),
    type: "modal",
  },
  {
    key: "testVariants",
    icon: Flask,
    label: "A/B Test",
    badgeLabel: getABTestingLabel,
    shortcutKey: "b",
    enabled: (data) => Boolean(data.testVariants && data.testCompletedAt),
    type: "modal",
  },
  {
    key: "password",
    icon: InputPassword,
    label: "Password",
    badgeLabel: getPasswordLabel,
    description:
      "Protect your links with a password so only authorized users can access them.",
    learnMoreUrl: "https://dub.co/help/article/password-protected-links",
    shortcutKey: "l",
    enabled: (data) => Boolean(data.password),
    type: "modal",
  },
];
