"use client";

import { ToggleGroup, useRouterStuff } from "@dub/ui";
import { useSearchParams } from "next/navigation";

const options = [
  {
    value: "sales",
    label: "Sales",
  },
  {
    value: "commissions",
    label: "Commissions",
  },
];

export function SaleToggle() {
  const { queryParams } = useRouterStuff();
  const searchParams = useSearchParams();
  const view = searchParams.get("view") || "sales";

  return (
    <ToggleGroup
      options={options}
      selected={view}
      selectAction={(option) => {
        queryParams({
          set: { view: option },
        });
      }}
      className="flex w-fit shrink-0 items-center gap-0.5 rounded-lg border-neutral-100 bg-neutral-100 p-0.5"
      optionClassName="h-9 flex items-center justify-center rounded-lg"
      indicatorClassName="border border-neutral-200 bg-white"
    />
  );
}
