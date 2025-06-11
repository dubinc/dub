import Events from "@/ui/analytics/events";
import { EventsProvider } from "@/ui/analytics/events/events-provider";
import LayoutLoader from "@/ui/layout/layout-loader";
import { PageContentOld } from "@/ui/layout/page-content";
import { Suspense } from "react";
import AnalyticsClient from "../../analytics/client";

export default function WorkspaceAnalyticsEvents() {
  return (
    <Suspense fallback={<LayoutLoader />}>
      <PageContentOld title="Events">
        <AnalyticsClient eventsPage>
          <EventsProvider>
            <Events />
          </EventsProvider>
        </AnalyticsClient>
      </PageContentOld>
    </Suspense>
  );
}
