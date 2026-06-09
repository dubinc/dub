import { PageContent } from "@/ui/layout/page-content";
import { PageWidthWrapper } from "@/ui/layout/page-width-wrapper";
import { ResolvedRiskEventsTable } from "./resolved-risk-events-table";

export default async function ResolvedRiskEventsPage(props: {
  params: Promise<{ slug: string }>;
}) {
  const params = await props.params;

  return (
    <PageContent
      title="Resolved risk events"
      titleBackHref={`/${params.slug}/program/risks`}
    >
      <PageWidthWrapper>
        <ResolvedRiskEventsTable />
      </PageWidthWrapper>
    </PageContent>
  );
}
