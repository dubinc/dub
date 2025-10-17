"use client";

import { useWorkspaceStore } from "@/lib/swr/use-workspace-store";
import { Button, InfoTooltip, Sitemap, Switch } from "@dub/ui";
import { formatDate } from "@dub/utils";
import { motion } from "motion/react";
import { useId } from "react";
import { toast } from "sonner";

export function SiteVisitTrackingSection() {
  const id = useId();

  const [enabled, setEnabled, { loading }] = useWorkspaceStore<boolean>(
    "analyticsSettingsSiteVisitTrackingEnabled",
    {
      mutateOnSet: true,
    },
  );

  const sitemaps = [
    {
      url: "dub.co/sitemap.xml",
      lastUpdated: new Date(),
    },
  ];

  return (
    <div className="flex flex-1 flex-col rounded-lg border border-neutral-200 bg-neutral-50">
      <div className="flex items-center justify-between gap-4 p-3">
        <div className="flex min-w-0 items-center gap-4">
          <div className="overflow-hidden">
            <label
              htmlFor={`${id}-switch`}
              className="text-content-emphasis block text-sm font-semibold"
            >
              Site visit tracking
            </label>
            <p className="text-content-subtle text-sm font-medium">
              For tracking site visits (organic visits from Google/SEO/AEO).
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
        <div className="flex flex-col gap-2 border-t border-neutral-200 p-3">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-1">
              <h2 className="text-content-emphasis text-sm font-semibold">
                Sitemaps
              </h2>
              <InfoTooltip content="Required for conversion tracking." />
            </div>
            <Button
              text="Add sitemap"
              className="h-7 w-fit rounded-lg px-2.5 py-1 text-sm font-medium"
              onClick={() => toast.info("Coming soon")}
            />
          </div>

          <div className="flex flex-col gap-2">
            {sitemaps.map((sitemap) => (
              <div
                key={sitemap.url}
                className="border-border-subtle flex items-center justify-between gap-4 rounded-xl border bg-white p-3"
              >
                <div className="flex min-w-0 items-center gap-2">
                  <div className="flex size-[28px] items-center justify-center rounded-md bg-neutral-100">
                    <Sitemap className="size-4 text-neutral-800" />
                  </div>
                  <span className="text-content-emphasis min-w-0 truncate text-sm font-semibold">
                    {sitemap.url}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  {sitemap.lastUpdated && (
                    <span className="text-content-subtle text-xs font-medium">
                      Updated {formatDate(sitemap.lastUpdated)}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </motion.div>
    </div>
  );
}
