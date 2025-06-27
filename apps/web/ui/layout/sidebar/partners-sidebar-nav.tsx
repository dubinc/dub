"use client";

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
  programSlug?: string;
  queryString?: string;
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
  programs: () => ({
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
            exact: true,
          },
          {
            name: "Invitations",
            icon: UserCheck,
            href: "/programs/invitations",
          },
        ],
      },
    ],
  }),

  program: ({ programSlug, queryString }) => ({
    title: (
      <div className="mb-3">
        <PartnerProgramDropdown />
      </div>
    ),
    content: [
      {
        items: [
          {
            name: "Overview",
            icon: Gauge6,
            href: `/programs/${programSlug}`,
            exact: true,
          },
          {
            name: "Earnings",
            icon: CircleDollar,
            href: `/programs/${programSlug}/earnings${queryString}`,
          },
          {
            name: "Links",
            icon: Hyperlink,
            href: `/programs/${programSlug}/links`,
          },
          {
            name: "Analytics",
            icon: LinesY,
            href: `/programs/${programSlug}/analytics`,
          },
          {
            name: "Events",
            icon: CursorRays,
            href: `/programs/${programSlug}/events`,
          },
          {
            name: "Resources",
            icon: ColorPalette2,
            href: `/programs/${programSlug}/resources`,
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
            href: "/profile/social",
          },
          // {
          //   name: "Payouts",
          //   icon: MoneyBills2,
          //   href: "/settings/payouts",
          // },
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

  return (
    <SidebarNav
      groups={NAV_GROUPS}
      areas={NAV_AREAS}
      currentArea={currentArea}
      data={{
        pathname,
        programSlug: programSlug || "",
        queryString: getQueryString(),
      }}
      toolContent={toolContent}
      newsContent={newsContent}
      bottom={
        <>{isEnrolledProgramPage ? <ProgramHelpSupport /> : <PayoutStats />}</>
      }
    />
  );
}
