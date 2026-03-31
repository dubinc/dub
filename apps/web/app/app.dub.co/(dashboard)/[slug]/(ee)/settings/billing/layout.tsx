import { PageContent } from "@/ui/layout/page-content";
import { PageWidthWrapper } from "@/ui/layout/page-width-wrapper";
import { ReactNode } from "react";

export default function BillingLayout({ children }: { children: ReactNode }) {
  return (
    <PageContent title="Billing">
      <PageWidthWrapper>{children}</PageWidthWrapper>
    </PageContent>
  );
}
