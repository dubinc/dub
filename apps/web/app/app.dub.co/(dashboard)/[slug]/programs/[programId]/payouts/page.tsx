import { PageContent } from "@/ui/layout/page-content";
import { ButtonControls } from "./button-controls";
import { ProgramPayoutsPageClient } from "./page-client";

export default function ProgramPayoutsPage() {
  return (
    <PageContent title="Payouts" titleControls={<ButtonControls />}>
      <ProgramPayoutsPageClient />
    </PageContent>
  );
}
