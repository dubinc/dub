import { PageContent } from "@/ui/layout/page-content";
import { PageWidthWrapper } from "@/ui/layout/page-width-wrapper";
import OAuthAppsPageClient from "./page-client";

export default async function OAuthAppsPage() {
  return (
    <PageContent
      title="OAuth Applications"
      titleInfo={{
        title:
          "Learn how to use OAuth applications to build integrations with Dub.",
        href: "https://dub.co/docs/integrations/quickstart",
      }}
    >
      <PageWidthWrapper>
        <OAuthAppsPageClient />
      </PageWidthWrapper>
    </PageContent>
  );
}
