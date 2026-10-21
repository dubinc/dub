"use client";

import usePartnerProfile from "@/lib/swr/use-partner-profile";
import { MainNav } from "@/ui/layout/main-nav";
import { HelpButton } from "@/ui/layout/sidebar/help-button";
import { PartnersSidebarNav } from "@/ui/layout/sidebar/partners-sidebar-nav";
import { ReactNode } from "react";
import { NetworkBanBanner } from "./network-ban-banner";

export function PartnerMainNav({ children }: { children: ReactNode }) {
  const { partner } = usePartnerProfile();
  const isBannedFromNetwork = partner?.networkStatus === "banned";

  return (
    <>
      {isBannedFromNetwork && <NetworkBanBanner />}
      <MainNav
        toolContent={<HelpButton />}
        sidebar={PartnersSidebarNav}
        hasBanner={isBannedFromNetwork}
      >
        {children}
      </MainNav>
    </>
  );
}
