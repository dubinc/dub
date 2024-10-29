"use client";

import useWorkspace from "@/lib/swr/use-workspace";
import { BetaFeatures } from "@/lib/types";
import {
  Books2,
  CircleInfo,
  ConnectedDots,
  CubeSettings,
  Gear2,
  Gift,
  Globe,
  Key,
  Receipt2,
  ShieldCheck,
  TableIcon,
  Users6,
  Webhook,
} from "@dub/ui/src/icons";
import { useParams, usePathname } from "next/navigation";
import { ReactNode, useMemo } from "react";
import UserSurveyButton from "../user-survey";
import { CursorRays } from "./icons/cursor-rays";
import { Gear } from "./icons/gear";
import { Hyperlink } from "./icons/hyperlink";
import { LinesY } from "./icons/lines-y";
import { SidebarNav, SidebarNavAreas } from "./sidebar-nav";
import { Usage } from "./usage";
import { WorkspaceDropdown } from "./workspace-dropdown";

const NAV_AREAS: SidebarNavAreas<{
  slug: string;
  flags?: Record<BetaFeatures, boolean>;
}> = {
  // Top-level
  default: ({ slug }) => ({
    showSwitcher: true,
    showNews: true,
    direction: "left",
    content: [
      {
        items: [
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
          {
            name: "Settings",
            icon: Gear,
            href: `/${slug}/settings`,
          },
        ],
      },
      {
        name: "Partnerships",
        items: [
          {
            name: "Programs",
            icon: TableIcon,
            href: `/${slug}/programs`,
          },
          {
            name: "Partners",
            icon: TableIcon,
            href: `/${slug}/partners`,
          },
          {
            name: "Payouts",
            icon: TableIcon,
            href: `/${slug}/payouts`,
          },
        ],
      },
    ],
  }),

  // Workspace settings
  workspaceSettings: ({ slug, flags }) => ({
    title: "Settings",
    backHref: `/${slug}`,
    content: [
      {
        name: "Workspace",
        items: [
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
            name: "Library",
            icon: Books2,
            href: `/${slug}/settings/library`,
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
        items: [
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
        items: [
          {
            name: "Notifications",
            icon: CircleInfo,
            href: `/${slug}/settings/notifications`,
          },
        ],
      },
    ],
  }),

  // User settings
  userSettings: ({ slug }) => ({
    title: "Settings",
    backHref: `/${slug}`,
    content: [
      {
        name: "Account",
        items: [
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
  }),
};

export function AppSidebarNav({
  toolContent,
  newsContent,
}: {
  toolContent?: ReactNode;
  newsContent?: ReactNode;
}) {
  const { slug } = useParams() as { slug?: string };
  const pathname = usePathname();
  const { flags } = useWorkspace();

  const currentArea = useMemo(() => {
    return pathname.startsWith("/account/settings")
      ? "userSettings"
      : pathname.startsWith(`/${slug}/settings`)
        ? "workspaceSettings"
        : "default";
  }, [slug, pathname]);

  return (
    <SidebarNav
      areas={NAV_AREAS}
      currentArea={currentArea}
      data={{ slug: slug || "", flags }}
      toolContent={toolContent}
      newsContent={newsContent}
      switcher={<WorkspaceDropdown />}
      bottom={
        <>
          <UserSurveyButton />
          <Usage />
        </>
      }
    />
  );
}
