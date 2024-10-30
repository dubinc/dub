"use client";

import useProgramEnrollment from "@/lib/swr/use-program-enrollment";
import { Button, Gear2, ShieldCheck } from "@dub/ui";
import {
  Check,
  ColorPalette2,
  Copy,
  CursorRays,
  Gauge6,
  Gear,
  GridIcon,
  Hyperlink,
  MoneyBills2,
  User,
  Users,
} from "@dub/ui/src/icons";
import { cn } from "@dub/utils";
import { Store } from "lucide-react";
import { useParams, usePathname } from "next/navigation";
import { ReactNode, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { PartnerProgramDropdown } from "./partner-program-dropdown";
import { SidebarNav, SidebarNavAreas } from "./sidebar-nav";

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
            icon: ColorPalette2,
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

  // User settings
  userSettings: ({ partnerId }) => ({
    title: "Settings",
    backHref: `/${partnerId}`,
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
  const { partnerId, programId } = useParams() as {
    partnerId?: string;
    programId?: string;
  };
  const pathname = usePathname();

  const currentArea = useMemo(() => {
    return pathname.startsWith("/account/settings")
      ? "userSettings"
      : pathname.startsWith(`/${partnerId}/settings`)
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
      bottom={<>{programId && <ProgramInfo />}</>}
    />
  );
}

function ProgramInfo() {
  const { programEnrollment } = useProgramEnrollment();
  const link = programEnrollment?.link;

  const linkContainer = useRef<HTMLDivElement>(null);

  const [isCopied, setIsCopied] = useState(false);
  const copyTimeout = useRef<NodeJS.Timeout | null>(null);

  return link ? (
    <div className="animate-fade-in px-3 py-4 text-xs leading-none">
      <div className="text-neutral-500">Referral link</div>
      <div className="mt-2 flex items-center gap-1">
        <div
          ref={linkContainer}
          className="flex h-7 grow items-center rounded-md bg-black/5 px-2 text-neutral-800 hover:bg-black/10"
          onClick={() => {
            if (linkContainer.current) {
              const selection = window.getSelection();
              if (selection && selection.type !== "Range")
                selection.selectAllChildren(linkContainer.current);
            }
          }}
        >
          {link.shortLink.replace("https://", "")}
        </div>
        <Button
          className="h-7 w-fit px-2"
          icon={
            <div className="relative size-4">
              <div
                className={cn(
                  "absolute inset-0 transition-[transform,opacity]",
                  isCopied && "translate-y-1 opacity-0",
                )}
              >
                <Copy className="size-4" />
              </div>
              <div
                className={cn(
                  "absolute inset-0 transition-[transform,opacity]",
                  !isCopied && "translate-y-1 opacity-0",
                )}
              >
                <Check className="size-4" />
              </div>
            </div>
          }
          onClick={() => {
            navigator.clipboard.writeText(link.shortLink);
            toast.success("Copied to clipboard");
            setIsCopied(true);
            if (copyTimeout.current) clearTimeout(copyTimeout.current);
            copyTimeout.current = setTimeout(() => setIsCopied(false), 1000);
          }}
        />
      </div>
    </div>
  ) : null;
}
