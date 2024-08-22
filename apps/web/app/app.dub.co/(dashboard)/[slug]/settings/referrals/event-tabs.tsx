"use client";

import { useRouterStuff } from "@dub/ui";
import { ToggleGroup } from "@dub/ui/src/toggle-group";

export function EventTabs() {
  const { queryParams, searchParams } = useRouterStuff();
  return (
    <ToggleGroup
      options={[
        { value: "clicks", label: "Clicks" },
        { value: "leads", label: "Leads" },
        { value: "sales", label: "Sales" },
      ]}
      selected={searchParams.get("event") ?? "clicks"}
      selectAction={(event) => queryParams({ set: { event }, del: "page" })}
    />
  );
}
