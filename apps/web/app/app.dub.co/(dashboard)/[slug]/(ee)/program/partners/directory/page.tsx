import { PageContent } from "@/ui/layout/page-content";
import { ComingSoonPage } from "../../coming-soon-page";
import { PartnersGraphic } from "../../partners-graphic";

export default function ProgramPartnersDirectory() {
  return (
    <PageContent title="Partner Directory">
      <ComingSoonPage
        title="Partner Directory"
        description="Discover top performing partners that have a proven track record of success helping companies grow."
        graphic={<PartnersGraphic />}
      />
    </PageContent>
  );
}
