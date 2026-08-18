"use client";

import { useProgramMessagesCount } from "@/lib/messages/hooks/use-program-messages-count";
import usePartnerProfile from "@/lib/swr/use-partner-profile";
import { usePartnerProgramBounties } from "@/lib/swr/use-partner-program-bounties";
import useProgramEnrollment from "@/lib/swr/use-program-enrollment";
import useProgramEnrollmentsCount from "@/lib/swr/use-program-enrollments-count";
import { MarketplaceSidebarFilters } from "@/ui/program-marketplace/marketplace-sidebar-filters";
import { ProgramMarketplaceCard } from "@/ui/program-marketplace/program-marketplace-card";
import { isMarketplaceFilterSidebarPath } from "@/ui/program-marketplace/utils/urls";
import { type Icon, useMediaQuery, useRouterStuff } from "@dub/ui";
import {
  Bell,
  CircleDollar,
  ColorPalette2,
  Gauge6,
  Gear2,
  Gift,
  GridIcon,
  MoneyBills2,
  Msgs,
  Nodes4,
  ShieldCheck,
  Shop,
  SquareUserSparkle2,
  Trophy,
  UserCheck,
  Users2,
  Webhook,
} from "@dub/ui/icons";
import { cn } from "@dub/utils";
import Link from "next/link";
import { useParams, usePathname } from "next/navigation";
import { ReactNode, useMemo } from "react";
import { CursorRays } from "./icons/cursor-rays";
import { Hyperlink } from "./icons/hyperlink";
import { LinesY } from "./icons/lines-y";
import { User } from "./icons/user";
import { PartnerProgramDropdown } from "./partner-program-dropdown";
import { PayoutStats } from "./payout-stats";
import { ProgramHelpSupport } from "./program-help-support";
import {
  NavItemType,
  SidebarNav,
  SidebarNavAreas,
  SidebarNavGroups,
} from "./sidebar-nav";

type SidebarNavData = {
  pathname: string;
  queryString?: string;
  isMobile?: boolean;
  programSlug?: string;
  isUnapproved: boolean;
  invitationsCount?: number;
  unreadMessagesCount?: number;
  programBountiesCount?: number;
  showDetailedAnalytics?: boolean;
  postbacksEnabled?: boolean;
  hasReferralReward?: boolean;
  newsContent?: ReactNode;
};

const NAV_GROUPS: SidebarNavGroups<SidebarNavData> = ({
  pathname,
  unreadMessagesCount,
}) => [
  {
    name: "Programs",
    description:
      "View all your enrolled programs and review invitations to other programs.",
    icon: GridIcon,
    href: "/programs",
    active:
      pathname.startsWith("/programs") || pathname.startsWith("/marketplace"),
  },
  {
    name: "Payouts",
    description:
      "View all your upcoming and previous payouts for all your programs.",
    icon: MoneyBills2,
    href: "/payouts",
    active: pathname.startsWith("/payouts"),
  },
  {
    name: "Partner profile",
    description:
      "Build a great partner profile and get noticed in our partner network.",
    icon: SquareUserSparkle2,
    href: "/profile",
    active: pathname.startsWith("/profile"),
  },
  {
    name: "Messages",
    description: "Chat with programs you're enrolled in",
    icon: Msgs,
    href: "/messages",
    active: pathname.startsWith("/messages"),
    badge: unreadMessagesCount ? Math.min(9, unreadMessagesCount) : undefined,
  },
];

const PROGRAMS_CONTENT = ({
  invitationsCount,
}: {
  invitationsCount?: number;
}): { items: NavItemType[] }[] => [
  {
    items: [
      {
        name: "Programs",
        icon: GridIcon,
        href: "/programs",
        isActive: (pathname, href) =>
          pathname.startsWith(href) && pathname !== "/programs/invitations",
      },
      {
        name: "Marketplace",
        icon: Shop,
        href: "/marketplace",
        isActive: (pathname) => pathname.startsWith("/marketplace"),
        badge: "New",
      },
      {
        name: "Invitations",
        icon: UserCheck,
        href: "/programs/invitations",
        badge: invitationsCount || undefined,
      },
    ],
  },
];

const NAV_AREAS: SidebarNavAreas<SidebarNavData> = {
  // Top-level
  programs: ({ invitationsCount }) => ({
    title: <PartnerProgramDropdown />,
    content: PROGRAMS_CONTENT({ invitationsCount }),
    direction: "left",
    showNews: true,
  }),

  marketplace: ({ isMobile, invitationsCount }) => ({
    title: <PartnerProgramDropdown />,
    content: isMobile ? (
      PROGRAMS_CONTENT({ invitationsCount })
    ) : (
      <MarketplaceSidebarFilters />
    ),
    direction: "right",
  }),

  profile: ({ postbacksEnabled }) => ({
    title: "Partner profile",
    content: [
      {
        items: [
          {
            name: "Profile",
            icon: SquareUserSparkle2,
            href: "/profile",
            exact: true,
          },
          {
            name: "Members",
            icon: Users2,
            href: "/profile/members",
          },
        ],
      },
      ...(postbacksEnabled
        ? [
            {
              name: "Developer",
              items: [
                {
                  name: "Postbacks",
                  icon: Webhook,
                  href: "/profile/postbacks" as `/${string}`,
                },
              ],
            },
          ]
        : []),
      {
        name: "Account",
        items: [
          {
            name: "Notifications",
            icon: Bell,
            href: "/profile/notifications",
          },
        ],
      },
    ],
    direction: "left",
  }),

  program: ({
    programSlug,
    isUnapproved,
    queryString,
    programBountiesCount,
    showDetailedAnalytics,
    hasReferralReward,
  }) => ({
    title: <PartnerProgramDropdown />,
    content: [
      {
        items: [
          {
            name: isUnapproved ? "Application" : "Overview",
            icon: isUnapproved ? UserCheck : Gauge6,
            href: `/programs/${programSlug}`,
            exact: true,
          },
          {
            name: "Links",
            icon: Hyperlink as Icon,
            href: `/programs/${programSlug}/links`,
            locked: isUnapproved,
          },
          {
            name: "Messages",
            icon: Msgs,
            href: `/messages/${programSlug}` as `/${string}`,
            locked: isUnapproved,
            arrow: true,
          },
        ],
      },
      {
        name: "Insights",
        items: [
          {
            name: "Earnings",
            icon: CircleDollar,
            href: `/programs/${programSlug}/earnings${queryString}`,
            locked: isUnapproved,
          },
          ...(showDetailedAnalytics
            ? [
                {
                  name: "Analytics",
                  icon: LinesY as Icon,
                  href: `/programs/${programSlug}/analytics` as `/${string}`,
                  locked: isUnapproved,
                },
                {
                  name: "Events",
                  icon: CursorRays as Icon,
                  href: `/programs/${programSlug}/events` as `/${string}`,
                  locked: isUnapproved,
                },
                {
                  name: "Customers",
                  icon: User as Icon,
                  href: `/programs/${programSlug}/customers` as `/${string}`,
                  locked: isUnapproved,
                },
              ]
            : []),
        ],
      },
      {
        name: "Engage",
        items: [
          {
            name: "Bounties",
            icon: Trophy,
            href: `/programs/${programSlug}/bounties` as `/${string}`,
            badge:
              programBountiesCount && programBountiesCount > 99
                ? "99+"
                : programBountiesCount || undefined,
            locked: isUnapproved,
          },
          ...(hasReferralReward
            ? [
                {
                  name: "Partner Referrals",
                  icon: Nodes4 as Icon,
                  href: `/programs/${programSlug}/referrals` as `/${string}`,
                  locked: isUnapproved,
                },
              ]
            : []),
          {
            name: "Resources",
            icon: ColorPalette2,
            href: `/programs/${programSlug}/resources`,
            locked: isUnapproved,
          },
        ],
      },
    ],
  }),

  // User settings
  userSettings: () => ({
    title: "Settings",
    backHref: "/programs",
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
        ],
      },
    ],
  }),
};

export function PartnersSidebarNav({
  toolContent,
  newsContent,
}: {
  toolContent?: ReactNode;
  newsContent?: ReactNode;
}) {
  const { programSlug } = useParams() as {
    programSlug?: string;
  };
  const pathname = usePathname();
  const { getQueryString } = useRouterStuff();

  const isEnrolledProgramPage =
    pathname.startsWith(`/programs/${programSlug}`) &&
    !["/apply", "/invite"].some((p) => pathname.endsWith(p));

  const { programEnrollment, showDetailedAnalytics } = useProgramEnrollment({
    enabled: isEnrolledProgramPage,
  });

  const isMarketplaceFilterSidebarPage =
    isMarketplaceFilterSidebarPath(pathname);

  const currentArea = useMemo(() => {
    return pathname.startsWith("/account/settings")
      ? "userSettings"
      : pathname.startsWith("/profile")
        ? "profile"
        : ["/payouts", "/messages"].some((p) => pathname.startsWith(p))
          ? null
          : isEnrolledProgramPage
            ? "program"
            : isMarketplaceFilterSidebarPage
              ? "marketplace"
              : "programs";
  }, [pathname, isEnrolledProgramPage, isMarketplaceFilterSidebarPage]);

  const { count: invitationsCount } = useProgramEnrollmentsCount({
    status: "invited",
  });

  const isUnapproved = useMemo(
    () =>
      !!programEnrollment &&
      !["approved", "deactivated", "archived"].includes(
        programEnrollment.status,
      ),
    [programEnrollment],
  );

  const { bountiesCount } = usePartnerProgramBounties({
    enabled:
      isEnrolledProgramPage && programEnrollment && !isUnapproved
        ? true
        : false,
  });

  const { count: unreadMessagesCount } = useProgramMessagesCount({
    enabled: true,
    query: {
      unread: true,
    },
  });

  const { isMobile } = useMediaQuery();

  const { partner } = usePartnerProfile();

  const referralsActive =
    pathname === "/referrals" || pathname.startsWith("/referrals/");

  const composedToolContent = (
    <div className="flex flex-col items-center gap-3">
      <Link
        href="/referrals"
        className={cn(
          "text-content-default flex size-11 shrink-0 items-center justify-center rounded-lg",
          referralsActive ? "bg-white" : "hover:bg-bg-inverted/5",
        )}
      >
        <Gift className="size-5" />
      </Link>
      {toolContent}
    </div>
  );

  return (
    <SidebarNav
      groups={NAV_GROUPS}
      areas={NAV_AREAS}
      currentArea={currentArea}
      data={{
        pathname,
        queryString: getQueryString(),
        isMobile,
        programSlug: programSlug || "",
        isUnapproved,
        invitationsCount,
        unreadMessagesCount,
        programBountiesCount: bountiesCount.active,
        showDetailedAnalytics,
        postbacksEnabled: partner?.featureFlags?.postbacks,
        hasReferralReward: !!programEnrollment?.referralRewardId,
        newsContent,
      }}
      toolContent={composedToolContent}
      newsContent={newsContent}
      bottom={
        isEnrolledProgramPage ? (
          <ProgramHelpSupport />
        ) : (
          <>
            <ProgramMarketplaceCard />
            <PayoutStats />
          </>
        )
      }
    />
  );
}
