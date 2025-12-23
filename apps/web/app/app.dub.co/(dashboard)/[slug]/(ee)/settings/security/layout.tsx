import { PageContent } from "@/ui/layout/page-content";
import { PageWidthWrapper } from "@/ui/layout/page-width-wrapper";
import { ReactNode } from "react";

export default function SecurityLayout({ children }: { children: ReactNode }) {
  return (
    <PageContent title="Security">
      <PageWidthWrapper>{children}</PageWidthWrapper>
    </PageContent>
  );
}
