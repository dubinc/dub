"use client";

import { partnerCanViewMarketplace } from "@/lib/network/get-discoverability-requirements";
import usePartnerProfile from "@/lib/swr/use-partner-profile";
import usePartnerProgramBounties from "@/lib/swr/use-partner-program-bounties";
import useProgramEnrollment from "@/lib/swr/use-program-enrollment";
import useProgramEnrollments from "@/lib/swr/use-program-enrollments";
import useProgramEnrollmentsCount from "@/lib/swr/use-program-enrollments-count";
import { useProgramMessagesCount } from "@/lib/swr/use-program-messages-count";
import { useRouterStuff } from "@dub/ui";
import {
  Bell,
  CircleDollar,
  ColorPalette2,
  Gauge6,
  Gear2,
  GridIcon,
  MoneyBills2,
  Msgs,
  ShieldCheck,
  Shop,
  SquareUserSparkle2,
  Trophy,
  UserCheck,
  Users2,
} from "@dub/ui/icons";
import { useParams, usePathname } from "next/navigation";
import { ReactNode, useMemo } from "react";
import { CursorRays } from "./icons/cursor-rays";
import { Hyperlink } from "./icons/hyperlink";
import { LinesY } from "./icons/lines-y";
import { PartnerProgramDropdown } from "./partner-program-dropdown";
import { PayoutStats } from "./payout-stats";
import { ProgramHelpSupport } from "./program-help-support";
import { SidebarNav, SidebarNavAreas, SidebarNavGroups } from "./sidebar-nav";

type SidebarNavData = {
  pathname: string;
  queryString?: string;
  programSlug?: string;
  isUnapproved: boolean;
  invitationsCount?: number;
  unreadMessagesCount?: number;
  programBountiesCount?: number;
  showDetailedAnalytics?: boolean;
  showMarketplace?: boolean;
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
    active: pathname.startsWith("/programs"),
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

const NAV_AREAS: SidebarNavAreas<SidebarNavData> = {
  // Top-level
  programs: ({ invitationsCount, showMarketplace }) => ({
    title: (
      <div className="mb-3">
        <PartnerProgramDropdown />
      </div>
    ),
    showNews: true,
    direction: "left",
    content: [
      {
        items: [
          {
            name: "Programs",
            icon: GridIcon,
            href: "/programs",
            isActive: (pathname, href) =>
              pathname.startsWith(href) &&
              ["invitations", "marketplace"].every(
                (k) => !pathname.startsWith(`${href}/${k}`),
              ),
          },
          ...(showMarketplace
            ? [
                {
                  name: "Marketplace",
                  icon: Shop,
                  href: "/programs/marketplace" as `/${string}`,
                  badge: "New",
                },
              ]
            : []),
          {
            name: "Invitations",
            icon: UserCheck,
            href: "/programs/invitations",
            badge: invitationsCount || undefined,
          },
        ],
      },
    ],
  }),

  profile: () => ({
    title: "Partner profile",
    direction: "left",
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
  }),

  program: ({
    programSlug,
    isUnapproved,
    queryString,
    programBountiesCount,
    showDetailedAnalytics,
  }) => ({
    title: (
      <div className="mb-3">
        <PartnerProgramDropdown />
      </div>
    ),
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
            icon: Hyperlink,
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
                  icon: LinesY,
                  href: `/programs/${programSlug}/analytics` as `/${string}`,
                  locked: isUnapproved,
                },
                {
                  name: "Events",
                  icon: CursorRays,
                  href: `/programs/${programSlug}/events` as `/${string}`,
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

  const { partner } = usePartnerProfile();

  const isEnrolledProgramPage =
    pathname.startsWith(`/programs/${programSlug}`) &&
    pathname !== `/programs/${programSlug}/apply`;

  const { programEnrollment, showDetailedAnalytics } = useProgramEnrollment({
    enabled: isEnrolledProgramPage,
  });

  const currentArea = useMemo(() => {
    return pathname.startsWith("/account/settings")
      ? "userSettings"
      : pathname.startsWith("/profile")
        ? "profile"
        : ["/payouts", "/messages"].some((p) => pathname.startsWith(p))
          ? null
          : isEnrolledProgramPage
            ? "program"
            : "programs";
  }, [pathname, programSlug, isEnrolledProgramPage]);

  const { programEnrollments } = useProgramEnrollments();
  const { count: invitationsCount } = useProgramEnrollmentsCount({
    status: "invited",
  });

  const { bountiesCount } = usePartnerProgramBounties({
    enabled: isEnrolledProgramPage,
  });

  const { count: unreadMessagesCount } = useProgramMessagesCount({
    enabled: true,
    query: {
      unread: true,
    },
  });

  return (
    <SidebarNav
      groups={NAV_GROUPS}
      areas={NAV_AREAS}
      currentArea={currentArea}
      data={{
        pathname,
        queryString: getQueryString(),
        programSlug: programSlug || "",
        isUnapproved:
          !!programEnrollment &&
          !["approved", "deactivated", "archived"].includes(
            programEnrollment.status,
          ),
        invitationsCount,
        unreadMessagesCount,
        programBountiesCount: bountiesCount.active,
        showDetailedAnalytics,
        showMarketplace: partnerCanViewMarketplace({
          partner,
          programEnrollments: programEnrollments || [],
        }),
      }}
      toolContent={toolContent}
      newsContent={newsContent}
      bottom={isEnrolledProgramPage ? <ProgramHelpSupport /> : <PayoutStats />}
    />
  );
}
