"use client";

import useWorkspace from "@/lib/swr/use-workspace";
import { useRouterStuff } from "@dub/ui";
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
  Users6,
  Webhook,
} from "@dub/ui/icons";
import { Session } from "next-auth";
import { useSession } from "next-auth/react";
import { useParams, usePathname } from "next/navigation";
import { ReactNode, useMemo } from "react";
import UserSurveyButton from "../user-survey";
import { ConnectedDots4 } from "./icons/connected-dots4";
import { CursorRays } from "./icons/cursor-rays";
import { Hyperlink } from "./icons/hyperlink";
import { LinesY } from "./icons/lines-y";
import { User } from "./icons/user";
import { SidebarNav, SidebarNavAreas } from "./sidebar-nav";
import { Usage } from "./usage";
import { WorkspaceDropdown } from "./workspace-dropdown";

const NAV_AREAS: SidebarNavAreas<{
  slug: string;
  pathname: string;
  queryString: string;
  defaultProgramId?: string;
  session?: Session | null;
  showNews?: boolean;
}> = {
  // Top-level
  default: ({ slug, pathname, queryString, defaultProgramId, showNews }) => ({
    showSwitcher: true,
    showNews,
    direction: "left",
    content: [
      {
        items: [
          {
            name: "Links",
            icon: Hyperlink,
            href: `/${slug}/links${pathname === `/${slug}/links` ? "" : queryString}`,
          },
          {
            name: "Analytics",
            icon: LinesY,
            href: `/${slug}/analytics${pathname === `/${slug}/analytics` ? "" : queryString}`,
          },
          {
            name: "Events",
            icon: CursorRays,
            href: `/${slug}/events${pathname === `/${slug}/events` ? "" : queryString}`,
          },
          {
            name: "Customers",
            icon: User,
            href: `/${slug}/customers`,
          },
          ...(defaultProgramId
            ? [
                {
                  name: "Program",
                  icon: ConnectedDots4,
                  href: `/${slug}/programs/${defaultProgramId}`,
                  items: [
                    {
                      name: "Overview",
                      href: `/${slug}/programs/${defaultProgramId}`,
                      exact: true,
                    },
                    {
                      name: "Partners",
                      href: `/${slug}/programs/${defaultProgramId}/partners`,
                    },
                    {
                      name: "Commissions",
                      href: `/${slug}/programs/${defaultProgramId}/commissions`,
                    },
                    {
                      name: "Payouts",
                      href: `/${slug}/programs/${defaultProgramId}/payouts?status=pending`,
                    },
                    {
                      name: "Resources",
                      href: `/${slug}/programs/${defaultProgramId}/resources`,
                    },
                    {
                      name: "Configuration",
                      href: `/${slug}/programs/${defaultProgramId}/settings`,
                    },
                  ],
                },
              ]
            : []),
        ],
      },
    ],
  }),

  // Workspace settings
  workspaceSettings: ({ slug }) => ({
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
            name: "Billing",
            icon: Receipt2,
            href: `/${slug}/settings/billing`,
          },
          {
            name: "Domains",
            icon: Globe,
            href: `/${slug}/settings/domains`,
          },
          {
            name: "Library",
            icon: Books2,
            href: `/${slug}/settings/library/folders`,
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
            name: "Analytics",
            icon: LinesY,
            href: `/${slug}/settings/analytics`,
          },
          {
            name: "Security",
            icon: ShieldCheck,
            href: `/${slug}/settings/security`,
          },
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
          {
            name: "Webhooks",
            icon: Webhook,
            href: `/${slug}/settings/webhooks`,
          },
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
  userSettings: ({ session, slug }) => ({
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
            name: "Referrals",
            icon: Gift,
            href: "/account/settings/referrals",
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
  const { getQueryString } = useRouterStuff();
  const { data: session } = useSession();
  const { defaultProgramId } = useWorkspace();

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
      data={{
        slug: slug || "",
        pathname,
        queryString: getQueryString(undefined, {
          include: ["folderId", "tagIds"],
        }),
        session: session || undefined,
        showNews: pathname.startsWith(`/${slug}/programs/`) ? false : true,
        defaultProgramId: defaultProgramId || undefined,
      }}
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
