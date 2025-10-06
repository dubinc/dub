"use client";

import { LockSmall, Switch } from "@dub/ui";
import { useId } from "react";
import { HostnameSection } from "./hostname-section";

const BaseScriptSection = () => {
  const id = useId();

  return (
    <div className="flex flex-1 flex-col rounded-lg border border-neutral-200 bg-neutral-50">
      <div className="flex items-center justify-between gap-4 p-5">
        <div className="flex min-w-0 items-center gap-4">
          <div className="overflow-hidden">
            <label
              htmlFor={`${id}-switch`}
              className="text-content-emphasis block text-sm font-semibold"
            >
              Base script
            </label>
            <p className="text-content-subtle text-sm font-medium">
              Required for all Dub tracking
            </p>
          </div>
        </div>

        <Switch
          disabledTooltip="Required for all Dub tracking"
          disabled
          checked={true}
          trackDimensions="radix-state-checked:bg-black focus-visible:ring-black/20 w-7 h-4"
          thumbDimensions="size-3"
          thumbTranslate="translate-x-3"
          thumbIcon={
            <div className="flex size-full items-center justify-center">
              <LockSmall className="size-[8px] text-black" />
            </div>
          }
        />
      </div>

      <HostnameSection className="border-t border-neutral-200" />
    </div>
  );
};

export default BaseScriptSection;
