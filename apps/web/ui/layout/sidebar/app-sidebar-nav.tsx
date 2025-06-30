"use client";

import { getPlanCapabilities } from "@/lib/plan-capabilities";
import useCustomersCount from "@/lib/swr/use-customers-count";
import useWorkspace from "@/lib/swr/use-workspace";
import { useRouterStuff } from "@dub/ui";
import {
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
  LinesY as LinesYStatic,
  MoneyBills2,
  PaperPlane,
  Receipt2,
  ShieldCheck,
  ShieldKeyhole,
  Sliders,
  Tag,
  UserCheck,
  Users2,
  Users6,
  Webhook,
} from "@dub/ui/icons";
import { Session } from "next-auth";
import { useSession } from "next-auth/react";
import { useParams, usePathname } from "next/navigation";
import { ReactNode, useMemo } from "react";
import { DubPartnersPopup } from "./dub-partners-popup";
import { Compass } from "./icons/compass";
import { ConnectedDots4 } from "./icons/connected-dots4";
import { CursorRays } from "./icons/cursor-rays";
import { Hyperlink } from "./icons/hyperlink";
import { LinesY } from "./icons/lines-y";
import { User } from "./icons/user";
import { SidebarNav, SidebarNavAreas, SidebarNavGroups } from "./sidebar-nav";
import { useProgramApplicationsCount } from "./use-program-applications-count";
import { WorkspaceDropdown } from "./workspace-dropdown";

type SidebarNavData = {
  slug: string;
  pathname: string;
  queryString: string;
  defaultProgramId?: string;
  session?: Session | null;
  showNews?: boolean;
  applicationsCount?: number;
  showConversionGuides?: boolean;
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
      "Kickstart viral product-led growth with powerful, branded referral and affiliate programs.",
    learnMoreHref: "https://dub.co/partners",
    icon: ConnectedDots4,
    href: slug ? `/${slug}/program` : "/program",
    active: pathname.startsWith(`/${slug}/program`),
    popup: DubPartnersPopup,

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
    showNews,
    direction: "left",
    content: [
      {
        items: [
          {
            name: "Links",
            icon: Hyperlink,
            href: `/${slug}/links${pathname === `/${slug}/links` ? "" : queryString}`,
            isActive: (pathname: string, href: string) => {
              const basePath = href.split("?")[0];

              // Exact match for the base links page
              if (pathname === basePath) return true;

              // Check if it's a link detail page (path segment after base contains a dot for domain)
              if (pathname.startsWith(basePath + "/")) {
                const nextSegment = pathname
                  .slice(basePath.length + 1)
                  .split("/")[0];
                return nextSegment.includes(".");
              }

              return false;
            },
          },
          {
            name: "Domains",
            icon: Globe,
            href: `/${slug}/links/domains`,
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
            href: `/${slug}/links/folders`,
          },
          {
            name: "Tags",
            icon: Tag,
            href: `/${slug}/links/tags`,
          },
          {
            name: "UTM Templates",
            icon: DiamondTurnRight,
            href: `/${slug}/links/utm`,
          },
        ],
      },
    ],
  }),

  // Program
  program: ({ slug, showNews, applicationsCount }) => ({
    title: "Partner Program",
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
            name: "Applications",
            icon: UserCheck,
            href: `/${slug}/program/partners/applications`,
            badge: applicationsCount
              ? applicationsCount > 99
                ? "99+"
                : applicationsCount
              : undefined,
          },
        ],
      },
      {
        name: "Insights",
        items: [
          {
            name: "Analytics",
            icon: LinesYStatic,
            href: `/${slug}/program/analytics`,
            badge: "New",
          },
          {
            name: "Commissions",
            icon: InvoiceDollar,
            href: `/${slug}/program/commissions`,
          },
          {
            name: "Fraud & Risk",
            icon: ShieldKeyhole,
            href: `/${slug}/program/fraud`,
          },
        ],
      },
      {
        name: "Configuration",
        items: [
          {
            name: "Rewards",
            icon: Gift,
            href: `/${slug}/program/rewards`,
          },
          {
            name: "Discounts",
            icon: Discount,
            href: `/${slug}/program/discounts`,
          },
          {
            name: "Branding",
            icon: Brush,
            href: `/${slug}/program/branding`,
          },
          {
            name: "Link Settings",
            icon: Sliders,
            href: `/${slug}/program/link-settings`,
          },
          {
            name: "Communication",
            icon: PaperPlane,
            href: `/${slug}/program/communication`,
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
    hideSwitcherIcons: true,
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
  const { plan, defaultProgramId } = useWorkspace();
  const { canTrackConversions } = getPlanCapabilities(plan);

  const currentArea = useMemo(() => {
    return pathname.startsWith("/account/settings")
      ? "userSettings"
      : pathname.startsWith(`/${slug}/settings`)
        ? "workspaceSettings"
        : // hacky fix for guides because slug is undefined at render time
          // TODO: remove when we migrate to Next.js 15 + PPR
          pathname.endsWith("/guides") || pathname.includes("/guides/")
          ? null
          : pathname.startsWith(`/${slug}/program`)
            ? "program"
            : "default";
  }, [slug, pathname]);

  const applicationsCount = useProgramApplicationsCount({
    enabled: Boolean(currentArea === "program" && defaultProgramId),
  });

  const { data: customersCount } = useCustomersCount({
    enabled: canTrackConversions === true,
  });

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
        applicationsCount,
        showConversionGuides: canTrackConversions && customersCount === 0,
      }}
      toolContent={toolContent}
      newsContent={newsContent}
      switcher={<WorkspaceDropdown />}
    />
  );
}
