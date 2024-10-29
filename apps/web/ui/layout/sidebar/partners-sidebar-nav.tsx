"use client";

import {
  CursorRays,
  Gauge6,
  Gear,
  GridIcon,
  Hyperlink,
  MoneyBills2,
  User,
  Users,
} from "@dub/ui/src/icons";
import { Store, SwatchBook } from "lucide-react";
import { useParams, usePathname } from "next/navigation";
import { ReactNode, useMemo } from "react";
import UserSurveyButton from "../user-survey";
import { PartnerProgramDropdown } from "./partner-program-dropdown";
import { SidebarNav, SidebarNavAreas } from "./sidebar-nav";
import { Usage } from "./usage";

const NAV_AREAS: SidebarNavAreas<{
  partnerId: string;
  programId?: string;
}> = {
  // Top-level
  default: ({ partnerId }) => ({
    showSwitcher: true,
    showNews: true,
    direction: "left",
    content: [
      {
        items: [
          {
            name: "Programs",
            icon: GridIcon,
            href: `/${partnerId}`,
            exact: true,
          },
          {
            name: "Marketplace",
            icon: Store,
            href: `/${partnerId}/marketplace`,
          },
          {
            name: "Settings",
            icon: Gear,
            href: `/${partnerId}/settings`,
          },
        ],
      },
    ],
  }),

  program: ({ partnerId, programId }) => ({
    showSwitcher: true,
    content: [
      {
        items: [
          {
            name: "Overview",
            icon: Gauge6,
            href: `/${partnerId}/${programId}`,
            exact: true,
          },
          {
            name: "Customers",
            icon: Users,
            href: `/${partnerId}/${programId}/customers`,
          },
          {
            name: "Events",
            icon: CursorRays,
            href: `/${partnerId}/${programId}/events`,
          },
          {
            name: "Links",
            icon: Hyperlink,
            href: `/${partnerId}/${programId}/links`,
          },
          {
            name: "Payouts",
            icon: MoneyBills2,
            href: `/${partnerId}/${programId}/payouts`,
          },
          {
            name: "Resources",
            icon: SwatchBook,
            href: `/${partnerId}/${programId}/resources`,
          },
        ],
      },
    ],
  }),

  partnerSettings: ({ partnerId }) => ({
    title: "Settings",
    backHref: `/${partnerId}`,
    content: [
      {
        name: "Partner",
        items: [
          {
            name: "Profile",
            icon: User,
            href: `/${partnerId}/settings`,
            exact: true,
          },
          {
            name: "Payouts",
            icon: MoneyBills2,
            href: `/${partnerId}/settings/payouts`,
          },
          {
            name: "People",
            icon: Users,
            href: `/${partnerId}/settings/people`,
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
  const { partnerId, programId } = useParams() as {
    partnerId?: string;
    programId?: string;
  };
  const pathname = usePathname();

  const currentArea = useMemo(() => {
    return pathname.startsWith(`/${partnerId}/settings`)
      ? "partnerSettings"
      : pathname.startsWith(`/${partnerId}/${programId}`)
        ? "program"
        : "default";
  }, [partnerId, pathname, programId]);

  return (
    <SidebarNav
      areas={NAV_AREAS}
      currentArea={currentArea}
      data={{ partnerId: partnerId || "", programId: programId || "" }}
      toolContent={toolContent}
      newsContent={newsContent}
      switcher={<PartnerProgramDropdown />}
      bottom={
        <>
          <UserSurveyButton />
          <Usage />
        </>
      }
    />
  );
}
