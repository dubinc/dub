import { ExpandedLinkProps } from "@/lib/types";
import {
  CircleHalfDottedClock,
  Crosshairs3,
  Incognito,
  InputPassword,
  WindowSearch,
} from "@dub/ui/icons";
import { UseFormSetValue } from "react-hook-form";
import { LinkFormData } from ".";
import { getExpirationLabel } from "./expiration-modal";
import { getPasswordLabel } from "./password-modal";
import { getTargetingLabel } from "./targeting-modal";

export const TOGGLES = [
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
];

export const MOBILE_MORE_ITEMS = [
  {
    key: "password",
    icon: InputPassword,
    label: "Password",
    badgeLabel: getPasswordLabel,
    description:
      "Protect your links with a password so only authorized users can access them.",
    learnMoreUrl: "https://dub.co/help/article/password-protected-links",
    shortcutKey: "l",
    enabled: (data: LinkFormData) => Boolean(data.password),
    remove: (setValue: UseFormSetValue<ExpandedLinkProps>) =>
      setValue("password", null, { shouldDirty: true }),
    type: "modal",
  },
  {
    key: "expiresAt",
    icon: CircleHalfDottedClock,
    label: "Link Expiration",
    badgeLabel: getExpirationLabel,
    description:
      "Set an expiration date for your links – after which it won't be accessible.",
    learnMoreUrl: "https://dub.co/help/article/link-expiration",
    shortcutKey: "e",
    enabled: (data: LinkFormData) => Boolean(data.expiresAt),
    remove: (setValue: UseFormSetValue<ExpandedLinkProps>) => {
      setValue("expiresAt", null, { shouldDirty: true });
      setValue("expiredUrl", null, { shouldDirty: true });
    },
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
    enabled: (data: LinkFormData) =>
      Boolean(
        data.ios || data.android || Object.keys(data.geo || {}).length > 0,
      ),
    remove: (setValue: UseFormSetValue<ExpandedLinkProps>) => {
      setValue("ios", null, { shouldDirty: true });
      setValue("android", null, { shouldDirty: true });
      setValue("geo", null, { shouldDirty: true });
    },
    type: "modal",
  },
];
