import { PageContent } from "@/ui/layout/page-content";
import { PageWidthWrapper } from "@/ui/layout/page-width-wrapper";
import { ProgramCommunication } from "./page-client";

export default function ProgramSettingsCommunicationPage() {
  return (
    <PageContent title="Communication">
      <PageWidthWrapper className="mb-8">
        <ProgramCommunication />
      </PageWidthWrapper>
    </PageContent>
  );
}
