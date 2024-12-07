"use client";

import usePartnerAnalytics from "@/lib/swr/use-partner-analytics";
import usePartnerProgramInvites from "@/lib/swr/use-partner-program-invites";
import useProgramEnrollment from "@/lib/swr/use-program-enrollment";
import { Button, useCopyToClipboard, useRouterStuff } from "@dub/ui";
import {
  ArrowRight,
  ChartActivity2,
  Check,
  CircleDollar,
  ColorPalette2,
  Copy,
  Gauge6,
  Gear,
  Gear2,
  GridIcon,
  Hyperlink,
  MoneyBills2,
  ShieldCheck,
  User,
  UserCheck,
  Users,
} from "@dub/ui/src/icons";
import { cn, currencyFormatter } from "@dub/utils";
import { Store } from "lucide-react";
import Link from "next/link";
import { useParams, usePathname } from "next/navigation";
import { ReactNode, useMemo } from "react";
import { PartnerProgramDropdown } from "./partner-program-dropdown";
import { SidebarNav, SidebarNavAreas } from "./sidebar-nav";

const NAV_AREAS: SidebarNavAreas<{
  programSlug?: string;
  queryString?: string;
  hasInvites?: boolean;
}> = {
  // Top-level
  default: ({ hasInvites }) => ({
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
            hasIndicator: hasInvites,
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
            name: "Analytics",
            icon: ChartActivity2,
            href: `/programs/${programSlug}/analytics${queryString}`,
          },
          {
            name: "Sales",
            icon: CircleDollar,
            href: `/programs/${programSlug}/sales${queryString}`,
          },
          {
            name: "Payouts",
            icon: MoneyBills2,
            href: `/programs/${programSlug}/payouts`,
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

  const { programInvites } = usePartnerProgramInvites();

  return (
    <SidebarNav
      areas={NAV_AREAS}
      currentArea={currentArea}
      data={{
        programSlug: programSlug || "",
        queryString: getQueryString(),
        hasInvites: programInvites && programInvites.length > 0,
      }}
      toolContent={toolContent}
      newsContent={newsContent}
      switcher={<PartnerProgramDropdown />}
      bottom={<>{programSlug && <ProgramInfo />}</>}
    />
  );
}

function ProgramInfo() {
  const { programSlug } = useParams() as {
    programSlug?: string;
  };

  const { programEnrollment } = useProgramEnrollment();

  const [copied, copyToClipboard] = useCopyToClipboard();

  const { data: analytics, loading } = usePartnerAnalytics();

  const items = [
    {
      icon: UserCheck,
      href: `/${programSlug}/analytics?event=leads&interval=all`,
      label: "Signups",
      value: analytics?.leads,
    },
    {
      icon: MoneyBills2,
      href: `/${programSlug}/sales?interval=all`,
      label: "Earnings",
      value: `${currencyFormatter((analytics?.earnings || 0) / 100)}`,
    },
  ];

  return programEnrollment ? (
    <div className="animate-fade-in grid gap-6 border-t border-neutral-300/80 px-3 py-5 text-xs leading-none">
      <div>
        <div className="text-neutral-500">My link</div>
        <div className="mt-2 flex items-center gap-1">
          <div className="flex h-7 grow items-center rounded-md bg-black/5 px-2 text-neutral-800">
            {programEnrollment.link?.shortLink.replace("https://", "")}
          </div>
          <Button
            className="h-7 w-fit px-2"
            icon={
              <div className="relative size-4">
                <div
                  className={cn(
                    "absolute inset-0 transition-[transform,opacity]",
                    copied && "translate-y-1 opacity-0",
                  )}
                >
                  <Copy className="size-4" />
                </div>
                <div
                  className={cn(
                    "absolute inset-0 transition-[transform,opacity]",
                    !copied && "translate-y-1 opacity-0",
                  )}
                >
                  <Check className="size-4" />
                </div>
              </div>
            }
            disabled={!programEnrollment.link?.shortLink}
            onClick={() =>
              programEnrollment.link?.shortLink &&
              copyToClipboard(programEnrollment.link?.shortLink)
            }
          />
        </div>
      </div>
      <div>
        <div className="text-neutral-500">Performance</div>
        <div className="mt-2 grid grid-cols-2 gap-2">
          {items.map(({ href, icon: Icon, label, value }, index) => (
            <Link
              key={index}
              href={href}
              className="group relative flex flex-col justify-between gap-3 rounded-lg bg-black/5 p-2 transition-colors hover:bg-black/10"
            >
              <ArrowRight className="absolute right-2 top-2 size-3.5 -rotate-45 text-neutral-400 opacity-0 transition-opacity group-hover:opacity-100" />
              <Icon className="size-3.5 text-gray-600" />
              <div>
                <p className="text-xs text-gray-600">{label}</p>
                {loading ? (
                  <div className="mt-1 h-4 w-10 animate-pulse rounded-md bg-gray-300" />
                ) : (
                  <p className="text-sm font-medium text-gray-800">{value}</p>
                )}
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  ) : null;
}
