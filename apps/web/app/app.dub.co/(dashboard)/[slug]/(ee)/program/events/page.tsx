import Events from "@/ui/analytics/events";
import { EventsProvider } from "@/ui/analytics/events/events-provider";
import LayoutLoader from "@/ui/layout/layout-loader";
import { PageContent } from "@/ui/layout/page-content";
import { Suspense } from "react";
import AnalyticsClient from "../../../links/analytics/client";
import ProgramEventsPageTitleLink from "./title-link";

export default function WorkspaceProgramEventsPage() {
  return (
    <Suspense fallback={<LayoutLoader />}>
      <PageContent title={<ProgramEventsPageTitleLink />}>
        <AnalyticsClient eventsPage>
          <EventsProvider>
            <Events />
          </EventsProvider>
        </AnalyticsClient>
      </PageContent>
    </Suspense>
  );
}
