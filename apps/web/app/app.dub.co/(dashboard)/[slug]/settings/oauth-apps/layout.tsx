import { PageContent } from "@/ui/layout/page-content";
import { PageWidthWrapper } from "@/ui/layout/page-width-wrapper";
import { ReactNode } from "react";
import CreateOAuthAppButton from "./create-oauth-app-button";

export default function OAuthAppsLayout({ children }: { children: ReactNode }) {
  return (
    <PageContent
      title="OAuth Applications"
      titleInfo={{
        title:
          "Learn how to use OAuth applications to build integrations with Dub.",
        href: "https://dub.co/docs/integrations/quickstart",
      }}
      controls={<CreateOAuthAppButton />}
    >
      <PageWidthWrapper>{children}</PageWidthWrapper>
    </PageContent>
  );
}
