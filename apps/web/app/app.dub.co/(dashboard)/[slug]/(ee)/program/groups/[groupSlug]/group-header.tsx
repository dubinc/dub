"use client";

import useGroup from "@/lib/swr/use-group";
import useProgram from "@/lib/swr/use-program";
import useWorkspace from "@/lib/swr/use-workspace";
import { GroupProps } from "@/lib/types";
import { DEFAULT_PARTNER_GROUP } from "@/lib/zod/schemas/groups";
import { GroupColorCircle } from "@/ui/partners/groups/group-color-circle";
import {
  ArrowUpRight2,
  Button,
  ChevronRight,
  Discount,
  Gift,
  Hyperlink,
  Post,
  Sliders,
  Users,
} from "@dub/ui";
import { cn, PARTNERS_DOMAIN } from "@dub/utils";
import Link from "next/link";
import { redirect, useParams, usePathname } from "next/navigation";

export function GroupHeaderTitle() {
  const { group, loading } = useGroup();
  const { slug: workspaceSlug } = useWorkspace();

  if (loading) {
    return <div className="h-7 w-32 animate-pulse rounded-md bg-neutral-200" />;
  }

  if (!group) {
    redirect(`/${workspaceSlug}/program/groups`);
  }

  return (
    <div className="flex items-center gap-1.5">
      <Link
        href={`/${workspaceSlug}/program/groups`}
        aria-label="Back to groups"
        title="Back to groups"
        className="bg-bg-subtle hover:bg-bg-emphasis flex size-8 shrink-0 items-center justify-center rounded-lg transition-[transform,background-color] duration-150 active:scale-95"
      >
        <Users className="size-4" />
      </Link>
      <ChevronRight className="text-content-muted size-2.5 shrink-0 [&_*]:stroke-2" />
      <div className="flex items-center gap-1.5">
        <GroupColorCircle group={group} />
        <span className="text-lg font-semibold leading-7 text-neutral-900">
          {group.name}
        </span>
      </div>
    </div>
  );
}

export function GroupHeaderTabs() {
  const pathname = usePathname();
  const { slug } = useParams<{ slug: string }>();
  const { program } = useProgram();
  const { group, loading } = useGroup();

  const GROUP_NAVIGATION_TABS = [
    {
      id: "rewards",
      label: "Rewards",
      icon: Gift,
      external: false,
      getHref: (group: GroupProps) =>
        `/${slug}/program/groups/${group.slug}/rewards`,
    },
    {
      id: "discounts",
      label: "Discounts",
      icon: Discount,
      external: false,
      getHref: (group: GroupProps) =>
        `/${slug}/program/groups/${group.slug}/discounts`,
    },
    {
      id: "links",
      label: "Links",
      icon: Hyperlink,
      external: false,
      getHref: (group: GroupProps) =>
        `/${slug}/program/groups/${group.slug}/links`,
    },
    {
      id: "partners",
      label: "Partners",
      icon: Users,
      external: true,
      getHref: (group: GroupProps) =>
        `/${slug}/program/partners?groupId=${group.id}`,
    },
    {
      id: "landing",
      label: "Landing page",
      icon: Post,
      external: true,
      getHref: (group: GroupProps) =>
        `${PARTNERS_DOMAIN}/${program?.slug}${
          group.slug === DEFAULT_PARTNER_GROUP.slug
            ? ""
            : `/${group.slug}/apply`
        }`,
    },
    {
      id: "settings",
      label: "Settings",
      icon: Sliders,
      external: false,
      getHref: (group: GroupProps) =>
        `/${slug}/program/groups/${group.slug}/settings`,
    },
  ];

  return (
    <div className="scrollbar-hide -mx-3 flex gap-2.5 overflow-x-auto px-3">
      {GROUP_NAVIGATION_TABS.map((tab) => {
        const Icon = tab.icon;

        if (loading || !group)
          return (
            <div
              key={tab.id}
              className="h-7 w-28 animate-pulse rounded-lg bg-neutral-200"
            />
          );

        const href = tab.getHref(group);
        const isActive = pathname === href;

        return (
          <Link
            key={tab.id}
            href={href}
            target={tab.external ? "_blank" : undefined}
          >
            <Button
              variant="secondary"
              icon={<Icon className="size-4" />}
              text={tab.label}
              right={
                tab.external ? (
                  <ArrowUpRight2 className="text-content-subtle size-3.5" />
                ) : undefined
              }
              className={cn("h-7 rounded-lg px-2.5 text-sm font-medium", {
                "bg-bg-subtle": isActive,
              })}
            />
          </Link>
        );
      })}
    </div>
  );
}
