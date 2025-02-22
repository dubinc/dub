import { PageContent } from "@/ui/layout/page-content";
import { HideProgramDetailsButton } from "./hide-program-details-button";
import ProgramPageClient from "./page-client";

export default function ProgramPage() {
  return (
    <PageContent
      title="Overview"
      hideReferButton
      titleControls={<HideProgramDetailsButton />}
    >
      <ProgramPageClient />
    </PageContent>
  );
}
