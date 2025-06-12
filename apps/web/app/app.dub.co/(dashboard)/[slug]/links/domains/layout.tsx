import { PageContent } from "@/ui/layout/page-content";
import { PageWidthWrapper } from "@/ui/layout/page-width-wrapper";
import { ReactNode } from "react";
import { DomainsHeader } from "../../settings/domains/header";

export default function DomainsLayout({ children }: { children: ReactNode }) {
  return (
    <PageContent
      title="Domains"
      titleInfo={{
        title:
          "Learn more about how to add, configure, and verify custom domains on Dub.",
        href: "https://dub.co/help/article/how-to-add-custom-domain",
      }}
    >
      <PageWidthWrapper>
        <div className="grid gap-4">
          <DomainsHeader baseUrl="/links/domains" />
          {children}
        </div>
      </PageWidthWrapper>
    </PageContent>
  );
}
