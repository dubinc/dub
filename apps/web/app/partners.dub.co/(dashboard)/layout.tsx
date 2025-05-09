import { MainNav } from "@/ui/layout/main-nav";
import { PartnersSidebarNav } from "@/ui/layout/sidebar/partners-sidebar-nav";
import { PartnerHelpButton } from "@/ui/layout/toolbar/partner-help-button";
import { PartnerProfileAuth } from "./auth";

export default function PartnerDashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <MainNav sidebar={PartnersSidebarNav}>
      <>
        <PartnerProfileAuth>{children}</PartnerProfileAuth>
        <div className="fixed bottom-4 right-4 z-50">
          <PartnerHelpButton />
        </div>
      </>
    </MainNav>
  );
}
