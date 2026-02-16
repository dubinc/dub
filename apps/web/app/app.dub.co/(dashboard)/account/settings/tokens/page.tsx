import { PageContent } from "@/ui/layout/page-content";
import { PageWidthWrapper } from "@/ui/layout/page-width-wrapper";
import TokensPageClient from "./page-client";

export default function TokensPage() {
  return (
    <PageContent
      title="API Keys"
      titleInfo={{
        title:
          "These API keys allow other apps to access your account. Use it with caution – do not share your API key with others, or expose it in the browser or other client-side code",
        href: "https://dub.co/docs/api-reference/tokens",
      }}
    >
      <PageWidthWrapper>
        <TokensPageClient />
      </PageWidthWrapper>
    </PageContent>
  );
}
