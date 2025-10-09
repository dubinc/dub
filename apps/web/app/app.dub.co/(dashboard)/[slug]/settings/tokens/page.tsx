import { PageContent } from "@/ui/layout/page-content";
import { PageWidthWrapper } from "@/ui/layout/page-width-wrapper";
import { CreateTokenButton } from "./create-token-button";
import TokensPageClient from "./page-client";

export default function TokensPage() {
  return (
    <PageContent
      title="Secret keys"
      titleInfo={{
        title:
          " These API keys allow other apps to access your workspace. Use it with caution – do not share your API key with others, or expose it in the browser or other client-side code.",
        href: "https://dub.co/docs/api-reference/tokens",
      }}
      controls={<CreateTokenButton />}
    >
      <PageWidthWrapper>
        <TokensPageClient />
      </PageWidthWrapper>
    </PageContent>
  );
}
