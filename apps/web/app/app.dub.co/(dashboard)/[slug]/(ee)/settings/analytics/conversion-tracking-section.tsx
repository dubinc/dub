"use client";

import { useWorkspaceStore } from "@/lib/swr/use-workspace-store";
import { Switch } from "@dub/ui";
import { motion } from "motion/react";
import { useId } from "react";
import { PublishableKeyForm } from "./publishable-key-form";

const ConversionTrackingSection = () => {
  const id = useId();

  const [enabled, setEnabled, { loading }] = useWorkspaceStore<boolean>(
    "analyticsSettingsConversionTrackingEnabled",
  );

  return (
    <div className="flex flex-1 flex-col rounded-lg border border-neutral-200 bg-neutral-50">
      <div className="flex items-center justify-between gap-4 p-3">
        <div className="flex min-w-0 items-center gap-4">
          <div className="overflow-hidden">
            <label
              htmlFor={`${id}-switch`}
              className="text-content-emphasis block text-sm font-semibold"
            >
              Conversion Tracking
            </label>
            <p className="text-content-subtle text-sm font-medium">
              For client-side conversion tracking.{" "}
              <a
                href="https://dub.co/docs/conversions/quickstart"
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

      <motion.div
        animate={{
          height: enabled ? "auto" : 0,
          overflow: "hidden",
        }}
        transition={{
          duration: 0.15,
        }}
        initial={false}
      >
        <PublishableKeyForm className="border-t border-neutral-200" />
      </motion.div>
    </div>
  );
};

export default ConversionTrackingSection;
