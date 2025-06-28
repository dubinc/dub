import { PageContent } from "@/ui/layout/page-content";
import { PageWidthWrapper } from "@/ui/layout/page-width-wrapper";
import { LinksSettings } from "./form";
import PartnerLinksButton from "./partner-links-button";

export default async function ProgramSettingsLinksPage() {
  return (
    <PageContent title="Link settings" controls={<PartnerLinksButton />}>
      <PageWidthWrapper className="mb-8">
        <LinksSettings />
      </PageWidthWrapper>
    </PageContent>
  );
}
