"use client";

import { ProgramsAreaNav } from "@/ui/layout/sidebar/programs-area-nav";
import { useMediaQuery } from "@dub/ui";
import { MarketplaceSidebarFilters } from "./marketplace-sidebar-filters";

export function MarketplaceSidebarPanel({
  invitationsCount,
}: {
  invitationsCount?: number;
}) {
  const { isDesktop } = useMediaQuery();

  if (!isDesktop) {
    return <ProgramsAreaNav invitationsCount={invitationsCount} />;
  }

  return <MarketplaceSidebarFilters />;
}
