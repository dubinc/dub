"use client";

import { EventType } from "@/lib/analytics/types";
import { useRouterStuff } from "@dub/ui";
import { ToggleGroup } from "@dub/ui/src/toggle-group";

export function EventTabs({ event }: { event: EventType }) {
  const { queryParams } = useRouterStuff();
  return (
    <ToggleGroup
      options={[
        { value: "clicks", label: "Clicks" },
        { value: "leads", label: "Leads" },
        { value: "sales", label: "Sales" },
      ]}
      selected={event}
      selectAction={(event) => queryParams({ set: { event } })}
    />
  );
}
