"use client";

import { LockFill, ToggleGroup } from "@dub/ui";
import { useState } from "react";

const TABS = [
  { id: "portal", label: "Partner portal" },
  // { id: "application", label: "Application form" },
  { id: "embed", label: "Embedded dashboard" },
] as const;

export function BrandingPreview() {
  const [tab, setTab] = useState<(typeof TABS)[number]["id"]>(TABS[0]["id"]);

  return (
    <div className="rounded-xl bg-neutral-50 px-8 py-6">
      <div className="flex justify-between">
        <span className="text-sm font-semibold text-black">Preview</span>
        <ToggleGroup
          options={TABS.map(({ id, label }) => ({
            value: id,
            label,
          }))}
          selected={tab}
          selectAction={(tab) => setTab(tab as any)}
          className="border-0 bg-transparent p-0"
          optionClassName="text-xs text-neutral-600 data-[selected=true]:text-neutral-900 hover:text-black px-2.5 py-2 leading-none"
          indicatorClassName="bg-neutral-100 border-neutral-200"
        />
      </div>
      <div className="flex size-full items-center justify-center">
        <div className="w-full p-1">
          <div className="w-full rounded-xl border border-neutral-200">
            <div className="flex items-center justify-between gap-4 rounded-[inherit] bg-white px-4 py-1.5">
              <div className="hidden grow basis-0 items-center gap-2 sm:flex">
                {[...Array(3)].map((_, idx) => (
                  <div
                    key={idx}
                    className="size-[9px] rounded-full bg-neutral-200"
                  />
                ))}
              </div>
              <div className="relative flex min-w-0 grow items-center justify-center gap-2 truncate rounded-md bg-neutral-50 px-2 py-1">
                <LockFill className="size-2.5 shrink-0 text-neutral-900" />
                <span className="select-none truncate text-xs font-medium leading-none">
                  partners.dub.co
                </span>
              </div>
              <div className="hidden grow basis-0 sm:block" />
            </div>
            <div className="flex h-60 items-center justify-center border-t border-neutral-200 bg-neutral-100/50 text-sm text-neutral-500">
              Preview coming soon
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
