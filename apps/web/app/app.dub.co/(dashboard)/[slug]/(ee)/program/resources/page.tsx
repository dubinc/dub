import { PageContent } from "@/ui/layout/page-content";
import { PageWidthWrapper } from "@/ui/layout/page-width-wrapper";
import { ProgramBrandAssets } from "./program-brand-assets";
import { ProgramHelpAndSupport } from "./program-help-and-support";

export default function ProgramResourcesPage() {
  return (
    <PageContent
      title="Resources"
      titleInfo={{
        title:
          "Learn how to configure brand and support resources for your partners.",
        href: "https://dub.co/help/article/program-resources",
      }}
    >
      <PageWidthWrapper className="mb-8 grid gap-8">
        <ProgramHelpAndSupport />
        <ProgramBrandAssets />
      </PageWidthWrapper>
    </PageContent>
  );
}
