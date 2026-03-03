import { PageContent } from "@/ui/layout/page-content";
import {
  PartnerBountyPageClient,
  PartnerBountyPageHeaderTitle,
} from "./page-client";

export default function PartnerBountyPage() {
  return (
    <PageContent title={<PartnerBountyPageHeaderTitle />}>
      <PartnerBountyPageClient />
    </PageContent>
  );
}
