import { PageContent } from "@/ui/layout/page-content";
import { PageWidthWrapper } from "@/ui/layout/page-width-wrapper";
import { LinksSettingsForm } from "./form";
import PartnerLinksButton from "./partner-links-button";

export default async function ProgramSettingsLinksPage() {
  return (
    <PageContent
      title="Link settings"
      titleInfo={{
        title:
          "Learn how configure your partner referral links and the different link types you can use.",
        href: "https://dub.co/help/article/partner-link-settings",
      }}
      controls={<PartnerLinksButton />}
    >
      <PageWidthWrapper className="mb-8">
        <LinksSettingsForm />
      </PageWidthWrapper>
    </PageContent>
  );
}
