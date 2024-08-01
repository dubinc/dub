import Events from "@/ui/analytics/events";
import { EventsProvider } from "@/ui/analytics/events/events-provider";
import LayoutLoader from "@/ui/layout/layout-loader";
import { Suspense } from "react";
import AnalyticsClient from "../analytics/client";

export default function WorkspaceAnalyticsEvents() {
  return (
    <Suspense fallback={<LayoutLoader />}>
      <AnalyticsClient>
        <EventsProvider>
          <Events />
        </EventsProvider>
      </AnalyticsClient>
    </Suspense>
  );
}
