import { PageContent } from "@/ui/layout/page-content";
import { PageWidthWrapper } from "@/ui/layout/page-width-wrapper";
import { LogsTable } from "@/ui/logs/logs-table";

export default function LogsPage() {
  return (
    <PageContent
      title="Logs"
      titleInfo={{
        title:
          "View request and response logs for API calls made to your workspace.",
      }}
    >
      <PageWidthWrapper>
        <LogsTable />
      </PageWidthWrapper>
    </PageContent>
  );
}
