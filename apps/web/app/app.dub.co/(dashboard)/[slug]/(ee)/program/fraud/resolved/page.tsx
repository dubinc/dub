import { PageContent } from "@/ui/layout/page-content";
import { PageWidthWrapper } from "@/ui/layout/page-width-wrapper";
import { ResolvedFraudEventGroupsTable } from "./resolved-fraud-event-groups-table";

export default async function ResolvedFraudEventsPage(props: {
  params: Promise<{ slug: string }>;
}) {
  const params = await props.params;

  return (
    <PageContent
      title="Resolved events"
      titleBackHref={`/${params.slug}/program/fraud`}
    >
      <PageWidthWrapper>
        <ResolvedFraudEventGroupsTable />
      </PageWidthWrapper>
    </PageContent>
  );
}
