"use client";

import { useRouterStuff } from "@dub/ui";
import {
  CircleDollar,
  ColorPalette2,
  Gauge6,
  Gear,
  Gear2,
  GridIcon,
  MoneyBills2,
  ShieldCheck,
  User,
  Users,
} from "@dub/ui/icons";
import { Store } from "lucide-react";
import { useParams, usePathname } from "next/navigation";
import { ReactNode, useMemo } from "react";
import { Hyperlink } from "./icons/hyperlink";
import { LinesY } from "./icons/lines-y";
import { PartnerProgramDropdown } from "./partner-program-dropdown";
import { PayoutStats } from "./payout-stats";
import { ProgramHelpSupport } from "./program-help-support";
import { SidebarNav, SidebarNavAreas } from "./sidebar-nav";

const NAV_AREAS: SidebarNavAreas<{
  programSlug?: string;
  queryString?: string;
}> = {
  // Top-level
  default: () => ({
    showSwitcher: true,
    showNews: true,
    direction: "left",
    content: [
      {
        items: [
          {
            name: "Programs",
            icon: GridIcon,
            href: "/programs",
          },
          {
            name: "Marketplace",
            icon: Store,
            href: "/marketplace",
          },
          {
            name: "Settings",
            icon: Gear,
            href: "/settings",
          },
        ],
      },
    ],
  }),

  program: ({ programSlug, queryString }) => ({
    showSwitcher: true,
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
            name: "Resources",
            icon: ColorPalette2,
            href: `/programs/${programSlug}/resources`,
          },
        ],
      },
    ],
  }),

  partnerSettings: () => ({
    title: "Settings",
    backHref: "/programs",
    content: [
      {
        name: "Partner",
        items: [
          {
            name: "Profile",
            icon: User,
            href: "/settings",
            exact: true,
          },
          {
            name: "Payouts",
            icon: MoneyBills2,
            href: "/settings/payouts",
          },
          {
            name: "People",
            icon: Users,
            href: "/settings/people",
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
      : pathname.startsWith("/settings")
        ? "partnerSettings"
        : isEnrolledProgramPage
          ? "program"
          : "default";
  }, [pathname, programSlug, isEnrolledProgramPage]);

  return (
    <SidebarNav
      areas={NAV_AREAS}
      currentArea={currentArea}
      data={{
        programSlug: programSlug || "",
        queryString: getQueryString(),
      }}
      toolContent={toolContent}
      newsContent={newsContent}
      switcher={<PartnerProgramDropdown />}
      bottom={
        <>
          {isEnrolledProgramPage && <ProgramHelpSupport />}
          <PayoutStats />
        </>
      }
    />
  );
}
