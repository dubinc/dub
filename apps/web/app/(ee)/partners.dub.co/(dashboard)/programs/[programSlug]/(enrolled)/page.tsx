import { PageContentOld } from "@/ui/layout/page-content";
import { HideProgramDetailsButton } from "./hide-program-details-button";
import ProgramPageClient from "./page-client";

export default function ProgramPage() {
  return (
    <PageContentOld
      title="Overview"
      showControls
      titleControls={<HideProgramDetailsButton />}
    >
      <ProgramPageClient />
    </PageContentOld>
  );
}
