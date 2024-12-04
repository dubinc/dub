import { PageContent } from "@/ui/layout/page-content";
import ProgramPayoutsPageClient from "./page-client";
import { TitleControls } from "./title-controls";

export default function ProgramPayouts() {
  return (
    <PageContent title="Payouts" titleControls={<TitleControls />}>
      <ProgramPayoutsPageClient />
    </PageContent>
  );
}
