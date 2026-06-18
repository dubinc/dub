"use client";

import { GridIcon, Shop, UserCheck } from "@dub/ui/icons";
import { NavItem, type NavItemType } from "./sidebar-nav";

export function getProgramsAreaNavItems(
  invitationsCount?: number,
): NavItemType[] {
  return [
    {
      name: "Programs",
      icon: GridIcon,
      href: "/programs",
      isActive: (pathname, href) =>
        pathname.startsWith(href) &&
        !pathname.startsWith(`${href}/invitations`),
    },
    {
      name: "Marketplace",
      icon: Shop,
      href: "/marketplace",
      isActive: (pathname) => pathname.startsWith("/marketplace"),
    },
    {
      name: "Invitations",
      icon: UserCheck,
      href: "/programs/invitations",
      badge: invitationsCount || undefined,
    },
  ];
}

export function ProgramsAreaNav({
  invitationsCount,
}: {
  invitationsCount?: number;
}) {
  return (
    <div className="flex flex-col gap-0.5">
      {getProgramsAreaNavItems(invitationsCount).map((item) => (
        <NavItem key={item.name} item={item} />
      ))}
    </div>
  );
}
