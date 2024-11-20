import { MainNav } from "@/ui/layout/main-nav";
import { HelpButtonRSC } from "@/ui/layout/sidebar/help-button-rsc";
import { PartnersSidebarNav } from "@/ui/layout/sidebar/partners-sidebar-nav";
import { MaxWidthWrapper } from "@dub/ui";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <MainNav toolContent={<HelpButtonRSC />} sidebar={PartnersSidebarNav}>
      <MaxWidthWrapper className="grid gap-5 py-8">{children}</MaxWidthWrapper>
    </MainNav>
  );
}
