import { PageContent } from "@/ui/layout/page-content";
import { PageWidthWrapper } from "@/ui/layout/page-width-wrapper";
import { ResolvedFraudEventGroupTable } from "./resolved-fraud-event-group-table";

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
        <ResolvedFraudEventGroupTable />
      </PageWidthWrapper>
    </PageContent>
  );
}
