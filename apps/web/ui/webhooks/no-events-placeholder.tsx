import { Webhook } from "lucide-react";
import EmptyState from "../shared/empty-state";

export const NoEventsPlaceholder = () => {
  return (
    <div className="rounded-xl border border-gray-200 py-10">
      <EmptyState
        icon={Webhook}
        title="No events"
        description="No events have been logged for this webhook. Events will appear as they are logged."
      />
    </div>
  );
};
