import { PageContent } from "@/ui/layout/page-content";
import { MaxWidthWrapper } from "@dub/ui";
import { ProgramBrandingPageClient } from "./page-client";

export default function ProgramBranding() {
  return (
    <PageContent title="Branding">
      <MaxWidthWrapper>
        <ProgramBrandingPageClient />
      </MaxWidthWrapper>
    </PageContent>
  );
}
