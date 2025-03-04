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
      className="w-fit shrink-0 items-center gap-1 border-neutral-100 bg-neutral-100"
      //  optionClassName="size-8 p-0 flex items-center justify-center"
      indicatorClassName="border border-neutral-200 bg-white"
    />
  );
}
