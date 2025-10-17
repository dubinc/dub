import { MainNav } from "@/ui/layout/main-nav";
import { PartnersSidebarNav } from "@/ui/layout/sidebar/partners-sidebar-nav";
import { CircleQuestion } from "@dub/ui";
import { PartnerProfileAuth } from "./auth";

export default function PartnerDashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <MainNav
      toolContent={
        <a
          href="https://dub.co/help/category/programs"
          target="_blank"
          className="text-content-default hover:bg-bg-inverted/5 flex size-11 shrink-0 items-center justify-center rounded-lg"
        >
          <CircleQuestion className="size-5" strokeWidth={2} />
        </a>
      }
      sidebar={PartnersSidebarNav}
    >
      <PartnerProfileAuth>{children}</PartnerProfileAuth>
    </MainNav>
  );
}
