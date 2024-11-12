import { MainNav } from "@/ui/layout/main-nav";
import { HelpButtonRSC } from "@/ui/layout/sidebar/help-button-rsc";
import { PartnersSidebarNav } from "@/ui/layout/sidebar/partners-sidebar-nav";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <MainNav toolContent={<HelpButtonRSC />} sidebar={PartnersSidebarNav}>
      {children}
    </MainNav>
  );
}
