import { MainNavOld } from "@/ui/layout/main-nav-old";
import { HelpButtonRSC } from "@/ui/layout/sidebar/help-button-rsc";
import { PartnersSidebarNav } from "@/ui/layout/sidebar/partners-sidebar-nav";
import { PartnerProfileAuth } from "./auth";

export default function PartnerDashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <MainNavOld
      toolContent={<HelpButtonRSC variant="old" />}
      sidebar={PartnersSidebarNav}
    >
      <PartnerProfileAuth>{children}</PartnerProfileAuth>
    </MainNavOld>
  );
}
