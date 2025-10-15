"use client";

import usePartnerProfile from "@/lib/swr/use-partner-profile";
import usePartnerProgramBounties from "@/lib/swr/use-partner-program-bounties";
import useProgramEnrollment from "@/lib/swr/use-program-enrollment";
import useProgramEnrollmentsCount from "@/lib/swr/use-program-enrollments-count";
import { useProgramMessagesCount } from "@/lib/swr/use-program-messages-count";
import { PartnerProps } from "@/lib/types";
import { useRouterStuff } from "@dub/ui";
import {
  Bell,
  CircleDollar,
  CircleInfo,
  ColorPalette2,
  Gauge6,
  Gear2,
  GridIcon,
  MoneyBills2,
  Msgs,
  ShieldCheck,
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
  partner?: PartnerProps;
  programSlug?: string;
  isUnapproved: boolean;
  invitationsCount?: number;
  unreadMessagesCount?: number;
  programBountiesCount?: number;
};

const NAV_GROUPS: SidebarNavGroups<SidebarNavData> = ({
  pathname,
  partner,
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
  ...(partner?.role === "member"
    ? []
    : [
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
      ]),
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
  programs: ({ invitationsCount }) => ({
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
              !pathname.startsWith(`${href}/invitations`),
          },
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
            isActive: (pathname, href) =>
              pathname.startsWith(href) &&
              !pathname.startsWith(`${href}/members`),
          },
          {
            name: "Members",
            icon: Users2,
            href: "/profile/members",
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
          {
            name: "Analytics",
            icon: LinesY,
            href: `/programs/${programSlug}/analytics`,
            locked: isUnapproved,
          },
          {
            name: "Events",
            icon: CursorRays,
            href: `/programs/${programSlug}/events`,
            locked: isUnapproved,
          },
        ],
      },
      {
        name: "Engage",
        items: [
          {
            name: "Bounties",
            icon: Trophy,
            href: `/programs/${programSlug}/bounties` as `/${string}`,
            badge: programBountiesCount
              ? programBountiesCount > 99
                ? "99+"
                : programBountiesCount
              : "New",
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

  // Partner settings
  partnerSettings: () => ({
    title: "Settings",
    direction: "left",
    content: [
      {
        name: "Account",
        items: [
          {
            name: "Notifications",
            icon: CircleInfo,
            href: "/settings/notifications",
            exact: true,
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
          {
            name: "Notifications",
            icon: Bell,
            href: "/account/settings/notifications",
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
  const { partner } = usePartnerProfile();
  const { programSlug } = useParams() as {
    programSlug?: string;
  };
  const { programEnrollment } = useProgramEnrollment();
  const pathname = usePathname();
  const { getQueryString } = useRouterStuff();

  const isEnrolledProgramPage =
    pathname.startsWith(`/programs/${programSlug}`) &&
    pathname !== `/programs/${programSlug}/apply`;

  const currentArea = useMemo(() => {
    return pathname.startsWith("/account/settings")
      ? "userSettings"
      : pathname.startsWith("/settings")
        ? "partnerSettings"
        : pathname.startsWith("/profile")
          ? "profile"
          : ["/payouts", "/messages"].some((p) => pathname.startsWith(p))
            ? null
            : isEnrolledProgramPage
              ? "program"
              : "programs";
  }, [pathname, programSlug, isEnrolledProgramPage]);

  const { count: invitationsCount } = useProgramEnrollmentsCount({
    status: "invited",
  });

  const { bounties } = usePartnerProgramBounties({
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
        partner,
        programSlug: programSlug || "",
        isUnapproved:
          !!programEnrollment && programEnrollment.status !== "approved",
        invitationsCount,
        unreadMessagesCount,
        programBountiesCount: bounties?.length,
      }}
      toolContent={toolContent}
      newsContent={newsContent}
      bottom={isEnrolledProgramPage ? <ProgramHelpSupport /> : <PayoutStats />}
    />
  );
}
