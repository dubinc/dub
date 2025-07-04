"use client";

import useProgramEnrollment from "@/lib/swr/use-program-enrollment";
import useProgramEnrollmentsCount from "@/lib/swr/use-program-enrollments-count";
import { useRouterStuff } from "@dub/ui";
import {
  CircleDollar,
  CircleUser,
  ColorPalette2,
  Gauge6,
  Gear2,
  Globe,
  GridIcon,
  MoneyBills2,
  ShieldCheck,
  SquareUserSparkle2,
  UserCheck,
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
};

const NAV_GROUPS: SidebarNavGroups<SidebarNavData> = ({ pathname }) => [
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

  program: ({ programSlug, isUnapproved, queryString }) => ({
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
            icon: Gauge6,
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
            name: "Resources",
            icon: ColorPalette2,
            href: `/programs/${programSlug}/resources`,
            locked: isUnapproved,
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
    ],
  }),

  // Partner profile
  profile: () => ({
    title: "Partner profile",
    direction: "left",
    content: [
      {
        items: [
          {
            name: "Profile info",
            icon: CircleUser,
            href: "/profile",
            exact: true,
          },
          {
            name: "Website and socials",
            icon: Globe,
            href: "/profile/sites",
          },
        ],
      },
    ],
  }),

  // Payouts
  payouts: () => ({
    title: "Payouts",
    content: [
      {
        items: [
          {
            name: "Payouts",
            icon: MoneyBills2,
            href: "/payouts",
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
  const { programEnrollment } = useProgramEnrollment();
  const pathname = usePathname();
  const { getQueryString } = useRouterStuff();

  const isEnrolledProgramPage =
    pathname.startsWith(`/programs/${programSlug}`) &&
    pathname !== `/programs/${programSlug}/apply`;

  const currentArea = useMemo(() => {
    return pathname.startsWith("/account/settings")
      ? "userSettings"
      : pathname.startsWith("/profile")
        ? "profile"
        : pathname.startsWith("/payouts")
          ? null
          : isEnrolledProgramPage
            ? "program"
            : "programs";
  }, [pathname, programSlug, isEnrolledProgramPage]);

  const { count: invitationsCount } = useProgramEnrollmentsCount({
    status: "invited",
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
          !!programEnrollment && programEnrollment.status !== "approved",
        invitationsCount,
      }}
      toolContent={toolContent}
      newsContent={newsContent}
      bottom={isEnrolledProgramPage ? <ProgramHelpSupport /> : <PayoutStats />}
    />
  );
}
