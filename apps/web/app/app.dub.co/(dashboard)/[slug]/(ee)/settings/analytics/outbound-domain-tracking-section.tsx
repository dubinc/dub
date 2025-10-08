"use client";

import { useWorkspaceStore } from "@/lib/swr/use-workspace-store";
import { Switch } from "@dub/ui";
import { useId } from "react";

const OutboundDomainTrackingSection = () => {
  const id = useId();

  const [enabled, setEnabled, { loading }] = useWorkspaceStore<boolean>(
    "analyticsSettingsOutboundDomainTrackingEnabled",
    {
      mutateOnSet: true,
    },
  );

  return (
    <div className="flex flex-1 flex-col rounded-lg border border-neutral-200 bg-neutral-50">
      <div className="gap-4m flex items-center justify-between p-3">
        <div className="flex min-w-0 items-center gap-4">
          <div className="overflow-hidden">
            <label
              htmlFor={`${id}-switch`}
              className="text-content-emphasis block text-sm font-semibold"
            >
              Outbound domain tracking
            </label>
            <p className="text-content-subtle text-sm font-medium">
              Track outbound clicks to your other domains.{" "}
              <a
                href="https://dub.co/docs/sdks/client-side/features/cross-domain-tracking#cross-domain-tracking"
                target="_blank"
                rel="noopener noreferrer"
                className="underline"
              >
                Learn more
              </a>
            </p>
          </div>
        </div>

        <Switch
          disabled={loading}
          checked={enabled || false}
          trackDimensions="radix-state-checked:bg-black focus-visible:ring-black/20 w-7 h-4"
          thumbDimensions="size-3"
          thumbTranslate="translate-x-3"
          fn={setEnabled}
        />
      </div>
    </div>
  );
};

export default OutboundDomainTrackingSection;
