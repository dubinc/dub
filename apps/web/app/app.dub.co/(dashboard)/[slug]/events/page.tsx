import Events from "@/ui/analytics/events";
import { EventsProvider } from "@/ui/analytics/events/events-provider";
import LayoutLoader from "@/ui/layout/layout-loader";
import { PageContent } from "@/ui/layout/page-content";
import { Suspense } from "react";

export default function WorkspaceAnalyticsEvents() {
  return (
    <Suspense fallback={<LayoutLoader />}>
      <PageContent title="Events">
        <EventsProvider>
          <Events />
        </EventsProvider>
      </PageContent>
    </Suspense>
  );
}
