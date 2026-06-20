import { PageContent } from "@/ui/layout/page-content";
import { PageWidthWrapper } from "@/ui/layout/page-width-wrapper";
import { NetworkPartnerDetailPageClient } from "./page-client";

export default async function NetworkPartnerDetailPage({
  params,
}: {
  params: Promise<{ partnerId: string }>;
}) {
  const { partnerId } = await params;

  return (
    <PageContent title="Partner Network">
      <PageWidthWrapper className="mb-10">
        <NetworkPartnerDetailPageClient partnerId={partnerId} />
      </PageWidthWrapper>
    </PageContent>
  );
}
