"use client";

import useGroup from "@/lib/swr/use-group";
import { GroupProps } from "@/lib/types";
import { GroupColorCircle } from "@/ui/partners/groups/group-color-circle";
import {
  ArrowUpRight,
  Button,
  ChevronRight,
  Discount,
  Gift,
  Sliders,
  Users,
} from "@dub/ui";
import { cn } from "@dub/utils";
import Link from "next/link";
import { usePathname } from "next/navigation";

// TODO:
// Handle error when the group doesn't exists

const GROUP_NAVIGATION_TABS = [
  {
    id: "rewards",
    label: "Rewards",
    icon: Gift,
    external: false,
    getHref(group: GroupProps) {
      return `/program/partners/groups/${group.slug}/rewards`;
    },
    isActive(pathname: string) {
      return pathname.includes("/rewards");
    },
  },
  {
    id: "discount",
    label: "Discount",
    icon: Discount,
    external: false,
    getHref(group: GroupProps) {
      return `/program/partners/groups/${group.slug}/discount`;
    },
    isActive(pathname: string) {
      return pathname.includes("/discounts");
    },
  },
  {
    id: "settings",
    label: "Settings",
    icon: Sliders,
    external: false,
    getHref(group: GroupProps) {
      return `/program/partners/groups/${group.slug}`;
    },
    isActive(pathname: string) {
      return pathname.includes("/");
    },
  },
  {
    id: "partners",
    label: "Partners",
    icon: Users,
    external: true,
    getHref(group: GroupProps) {
      return `/program/commissions?groupId=${group.id}`;
    },
    isActive(pathname: string) {
      return false;
    },
  },
] as const;

export function GroupHeader() {
  const pathname = usePathname();
  const { group, loading } = useGroup();

  if (loading || !group) {
    return <div className="h-7 w-32 animate-pulse rounded-md bg-neutral-200" />;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-1">
        <div className="flex items-center justify-center rounded-lg bg-neutral-100 p-2">
          <Users className="size-4" />
        </div>
        <div className="flex items-center gap-1.5">
          <ChevronRight className="text-content-subtle size-2.5 shrink-0 [&_*]:stroke-2" />
          <div className="flex items-center gap-1.5">
            {<GroupColorCircle group={group} />}
            <span className="text-lg font-semibold leading-7 text-neutral-900">
              {group.name}
            </span>
          </div>
        </div>
      </div>

      <div className="flex gap-2.5">
        {GROUP_NAVIGATION_TABS.map((tab) => {
          const Icon = tab.icon;
          const isActive = tab.isActive(pathname);

          return (
            <Link
              key={tab.id}
              href={tab.getHref(group)}
              target={tab.external ? "_blank" : undefined}
            >
              <Button
                variant="secondary"
                icon={<Icon className="size-4" />}
                text={tab.label}
                right={
                  tab.external ? <ArrowUpRight className="size-3" /> : undefined
                }
                className={cn("h-7 rounded-lg px-3 text-sm font-medium", {
                  "bg-bg-subtle": isActive,
                })}
              />
            </Link>
          );
        })}
      </div>
    </div>
  );
}
