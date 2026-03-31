import { MainNav } from "@/ui/layout/main-nav";
import { HelpButton } from "@/ui/layout/sidebar/help-button";
import { PartnersSidebarNav } from "@/ui/layout/sidebar/partners-sidebar-nav";
import { PartnerProfileAuth } from "./auth";

export default function PartnerDashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <MainNav toolContent={<HelpButton />} sidebar={PartnersSidebarNav}>
      <PartnerProfileAuth>{children}</PartnerProfileAuth>
    </MainNav>
  );
}
