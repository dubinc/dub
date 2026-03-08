import Events from "@/ui/analytics/events";
import { EventsProvider } from "@/ui/analytics/events/events-provider";
import { PageContent } from "@/ui/layout/page-content";

export default function ProgramEvents() {
  return (
    <PageContent title="Events">
      <EventsProvider>
        <Events />
      </EventsProvider>
    </PageContent>
  );
}
