import { PageWidthWrapper } from "@/ui/layout/page-width-wrapper";
import { PartnersNavTabs } from "./partners-nav-tabs";

export default function AdminPartnersLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <PageWidthWrapper className="pb-12 pt-4">
      <div className="border-border-subtle overflow-hidden rounded-xl border bg-neutral-100">
        <PartnersNavTabs />
        <div className="border-border-subtle -mx-px -mb-px rounded-xl border bg-white p-4">
          {children}
        </div>
      </div>
    </PageWidthWrapper>
  );
}
