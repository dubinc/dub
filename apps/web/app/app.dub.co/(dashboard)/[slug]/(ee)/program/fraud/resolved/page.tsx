import { PageContent } from "@/ui/layout/page-content";
import { PageWidthWrapper } from "@/ui/layout/page-width-wrapper";
import { ResolvedFraudGroupTable } from "./resolved-fraud-group-table";

export default async function ResolvedFraudGroupsPage(props: {
  params: Promise<{ slug: string }>;
}) {
  const params = await props.params;

  return (
    <PageContent
      title="Resolved events"
      titleBackHref={`/${params.slug}/program/fraud`}
    >
      <PageWidthWrapper>
        <ResolvedFraudGroupTable />
      </PageWidthWrapper>
    </PageContent>
  );
}
