"use client";

import { useRouterStuff } from "@dub/ui";
import {
  CircleDollar,
  ColorPalette2,
  Gauge6,
  Gear,
  Gear2,
  GridIcon,
  Hyperlink,
  MoneyBills2,
  ShieldCheck,
  User,
  Users,
} from "@dub/ui/icons";
import { Store } from "lucide-react";
import { useParams, usePathname } from "next/navigation";
import { ReactNode, useMemo } from "react";
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
            exact: true,
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

  const currentArea = useMemo(() => {
    return pathname.startsWith("/account/settings")
      ? "userSettings"
      : pathname.startsWith("/settings")
        ? "partnerSettings"
        : pathname.startsWith(`/programs/${programSlug}`)
          ? "program"
          : "default";
  }, [pathname, programSlug]);

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
          {programSlug && <ProgramHelpSupport />}
          <PayoutStats />
        </>
      }
    />
  );
}
