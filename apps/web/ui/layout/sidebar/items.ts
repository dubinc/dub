import { BetaFeatures } from "@/lib/types";
import {
  CircleInfo,
  ConnectedDots,
  CubeSettings,
  Gear2,
  Gift,
  Globe,
  Key,
  Receipt2,
  ShieldCheck,
  Tag,
  Users6,
} from "@dub/ui/src/icons";
import { Webhook } from "lucide-react";
import { ComponentType, SVGProps } from "react";
import { CursorRays } from "./icons/cursor-rays";
import { Hyperlink } from "./icons/hyperlink";
import { LinesY } from "./icons/lines-y";

type NavItem = {
  name: string;
  icon: ComponentType<SVGProps<SVGSVGElement> & { isActive?: boolean }>;
  href: string;
  exact?: boolean;
};

export const ITEMS: Record<
  string,
  {
    name?: string;
    items: (args: {
      slug: string;
      flags?: Record<BetaFeatures, boolean>;
    }) => NavItem[];
  }[]
> = {
  // Top-level
  default: [
    {
      items: ({ slug }) => [
        {
          name: "Links",
          icon: Hyperlink,
          href: `/${slug}`,
          exact: true,
        },
        {
          name: "Analytics",
          icon: LinesY,
          href: `/${slug}/analytics`,
        },
        {
          name: "Events",
          icon: CursorRays,
          href: `/${slug}/events`,
        },
      ],
    },
  ],

  // Workspace settings
  workspaceSettings: [
    {
      name: "Workspace",
      items: ({ slug, flags }) => [
        {
          name: "General",
          icon: Gear2,
          href: `/${slug}/settings`,
          exact: true,
        },
        {
          name: "Domains",
          icon: Globe,
          href: `/${slug}/settings/domains`,
        },
        {
          name: "Tags",
          icon: Tag,
          href: `/${slug}/settings/tags`,
        },
        {
          name: "Billing",
          icon: Receipt2,
          href: `/${slug}/settings/billing`,
        },
        {
          name: "People",
          icon: Users6,
          href: `/${slug}/settings/people`,
        },
        {
          name: "Integrations",
          icon: ConnectedDots,
          href: `/${slug}/settings/integrations`,
        },
        {
          name: "Security",
          icon: ShieldCheck,
          href: `/${slug}/settings/security`,
        },
        ...(flags?.referrals
          ? [
              {
                name: "Referrals",
                icon: Gift,
                href: `/${slug}/settings/referrals`,
              },
            ]
          : []),
      ],
    },
    {
      name: "Developer",
      items: ({ slug, flags }) => [
        {
          name: "API Keys",
          icon: Key,
          href: `/${slug}/settings/tokens`,
        },
        {
          name: "OAuth Apps",
          icon: CubeSettings,
          href: `/${slug}/settings/oauth-apps`,
        },
        ...(flags?.webhooks
          ? [
              {
                name: "Webhooks",
                icon: Webhook,
                href: `/${slug}/settings/webhooks`,
              },
            ]
          : []),
      ],
    },
    {
      name: "Account",
      items: ({ slug }) => [
        {
          name: "Notifications",
          icon: CircleInfo,
          href: `/${slug}/settings/notifications`,
        },
      ],
    },
  ],

  // User settings
  userSettings: [
    {
      name: "Account",
      items: () => [
        {
          name: "General",
          icon: Gear2,
          href: "/account/settings",
          exact: true,
        },
        {
          name: "Security",
          icon: ShieldCheck,
          href: "/account/settings/security",
        },
        {
          name: "API Keys",
          icon: Key,
          href: "/account/settings/tokens",
        },
      ],
    },
  ],
};
