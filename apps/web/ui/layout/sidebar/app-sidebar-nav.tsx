"use client";

import useWorkspace from "@/lib/swr/use-workspace";
import { useRouterStuff } from "@dub/ui";
import {
  Books2,
  Brush,
  CircleInfo,
  ConnectedDots,
  CubeSettings,
  DiamondTurnRight,
  Discount,
  Folder,
  Gauge6,
  Gear2,
  Gift,
  Globe,
  InvoiceDollar,
  Key,
  MoneyBills2,
  PaperPlane,
  Receipt2,
  ShieldCheck,
  Sliders,
  Tag,
  UserPlus,
  Users2,
  Users6,
  Webhook,
} from "@dub/ui/icons";
import { Session } from "next-auth";
import { useSession } from "next-auth/react";
import { useParams, usePathname } from "next/navigation";
import { ReactNode, useMemo } from "react";
import { Compass } from "./icons/compass";
import { ConnectedDots4 } from "./icons/connected-dots4";
import { CursorRays } from "./icons/cursor-rays";
import { Hyperlink } from "./icons/hyperlink";
import { LinesY } from "./icons/lines-y";
import { User } from "./icons/user";
import { SidebarNav, SidebarNavAreas, SidebarNavGroups } from "./sidebar-nav";
import { WorkspaceDropdown } from "./workspace-dropdown";

type SidebarNavData = {
  slug: string;
  pathname: string;
  queryString: string;
  defaultProgramId?: string;
  session?: Session | null;
  showNews?: boolean;
};

const FIVE_YEARS_SECONDS = 60 * 60 * 24 * 365 * 5;

const NAV_GROUPS: SidebarNavGroups<SidebarNavData> = ({
  slug,
  pathname,
  defaultProgramId,
}) => [
  {
    name: "Short Links",
    description:
      "Create, organize, and measure the performance of your short links.",
    learnMoreHref: "https://dub.co/links",
    icon: Compass,
    href: slug ? `/${slug}/links` : "/links",
    active:
      !!slug &&
      pathname.startsWith(`/${slug}`) &&
      !pathname.startsWith(`/${slug}/program`) &&
      !pathname.startsWith(`/${slug}/settings`),

    onClick: () => {
      document.cookie = `dub_product:${slug}=links;path=/;max-age=${FIVE_YEARS_SECONDS}`;
    },
  },
  {
    name: "Partner Program",
    description:
      "Manage your partner program, performance, partners, and payouts.",
    learnMoreHref: "https://dub.co/partners",
    icon: ConnectedDots4,
    href: slug ? `/${slug}/program` : "/program",
    active: pathname.startsWith(`/${slug}/program`),

    onClick: defaultProgramId
      ? () => {
          document.cookie = `dub_product:${slug}=program;path=/;max-age=${FIVE_YEARS_SECONDS}`;
        }
      : undefined,
  },
];

const NAV_AREAS: SidebarNavAreas<SidebarNavData> = {
  // Top-level
  default: ({ slug, pathname, queryString, showNews }) => ({
    title: "Short Links",
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
            name: "Domains",
            icon: Globe,
            href: `/${slug}/domains`,
          },
        ],
      },
      {
        name: "Insights",
        items: [
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
        ],
      },
      {
        name: "Library",
        items: [
          {
            name: "Folders",
            icon: Folder,
            href: `/${slug}/library/folders`,
          },
          {
            name: "Tags",
            icon: Tag,
            href: `/${slug}/library/tags`,
          },
          {
            name: "UTM Templates",
            icon: DiamondTurnRight,
            href: `/${slug}/library/utm`,
          },
        ],
      },
    ],
  }),

  // Program
  program: ({ slug, showNews }) => ({
    title: "Partner Program",
    showSwitcher: true,
    showNews,
    direction: "left",
    content: [
      {
        items: [
          {
            name: "Overview",
            icon: Gauge6,
            href: `/${slug}/program`,
            exact: true,
          },
          {
            name: "Payouts",
            icon: MoneyBills2,
            href: `/${slug}/program/payouts?status=pending&sortBy=amount`,
          },
        ],
      },
      {
        name: "Partners",
        items: [
          {
            name: "All Partners",
            icon: Users2,
            href: `/${slug}/program/partners`,
            exact: true,
          },
          {
            name: "Partner Directory",
            icon: UserPlus,
            href: `/${slug}/program/partners/directory`,
          },
        ],
      },
      {
        name: "Insights",
        items: [
          {
            name: "Commissions",
            icon: InvoiceDollar,
            href: `/${slug}/program/commissions`,
          },
        ],
      },
      {
        name: "Configuration",
        items: [
          {
            name: "Rewards",
            icon: Gift,
            href: `/${slug}/program/settings/rewards`,
          },
          {
            name: "Discounts",
            icon: Discount,
            href: `/${slug}/program/settings/discounts`,
          },
          {
            name: "Branding",
            icon: Brush,
            href: `/${slug}/program/branding`,
          },
          {
            name: "Link Settings",
            icon: Sliders,
            href: `/${slug}/program/settings/links`,
          },
          {
            name: "Communication",
            icon: PaperPlane,
            href: `/${slug}/program/settings/communication`,
          },
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
        : pathname.startsWith(`/${slug}/program`)
          ? "program"
          : "default";
  }, [slug, pathname]);

  return (
    <SidebarNav
      groups={NAV_GROUPS}
      areas={NAV_AREAS}
      currentArea={currentArea}
      data={{
        slug: slug || "",
        pathname,
        queryString: getQueryString(undefined, {
          include: ["folderId", "tagIds"],
        }),
        session: session || undefined,
        showNews: pathname.startsWith(`/${slug}/program`) ? false : true,
        defaultProgramId: defaultProgramId || undefined,
      }}
      toolContent={toolContent}
      newsContent={newsContent}
      switcher={<WorkspaceDropdown />}
    />
  );
}
