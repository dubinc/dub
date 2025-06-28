import Events from "@/ui/analytics/events";
import { EventsProvider } from "@/ui/analytics/events/events-provider";
import LayoutLoader from "@/ui/layout/layout-loader";
import AnalyticsClient from "app/app.dub.co/(dashboard)/[slug]/analytics/client";
import { Suspense } from "react";

export default function AdminEvents() {
  return (
    <Suspense fallback={<LayoutLoader />}>
      <AnalyticsClient eventsPage>
        <EventsProvider>
          <Events adminPage />
        </EventsProvider>
      </AnalyticsClient>
    </Suspense>
  );
}
