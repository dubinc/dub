import { PageContent } from "@/ui/layout/page-content";
import { PageWidthWrapper } from "@/ui/layout/page-width-wrapper";
import { ReactNode } from "react";

export default function IntegrationsLayout({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <PageContent
      title="Integrations"
      titleInfo={{
        title:
          "Use Dub with your existing favorite tools with our seamless integrations.",
        href: "https://d.to/integrations",
      }}
    >
      <PageWidthWrapper>{children}</PageWidthWrapper>
    </PageContent>
  );
}
