"use client";

import { clientAccessCheck } from "@/lib/client-access-check";
import useWorkspace from "@/lib/swr/use-workspace";
import { useWorkspaceStore } from "@/lib/swr/use-workspace-store";
import { ThreeDots } from "@/ui/shared/icons";
import {
  Button,
  InfoTooltip,
  LoadingSpinner,
  LockSmall,
  Popover,
  Sitemap,
  Switch,
} from "@dub/ui";
import { Trash } from "@dub/ui/icons";
import { cn, formatDate } from "@dub/utils";
import { RefreshCw } from "lucide-react";
import { motion } from "motion/react";
import { useId, useState } from "react";
import { toast } from "sonner";

export function SiteVisitTrackingSection() {
  const switchId = useId();
  const workspace = useWorkspace();
  const { role, id, mutate } = workspace;
  const trackedSitemaps = (workspace as { trackedSitemaps?: unknown })
    .trackedSitemaps;
  const [newSitemapUrl, setNewSitemapUrl] = useState("");
  const [addingSitemap, setAddingSitemap] = useState(false);
  const [refreshingSitemapUrl, setRefreshingSitemapUrl] = useState<
    string | null
  >(null);
  const [deletingSitemapUrl, setDeletingSitemapUrl] = useState<string | null>(
    null,
  );

  const [enabled, setEnabled, { loading }] = useWorkspaceStore<boolean>(
    "analyticsSettingsSiteVisitTrackingEnabled",
    {
      mutateOnSet: true,
    },
  );
  const siteVisitTrackingEnabled = Boolean(enabled);

  const permissionsError = clientAccessCheck({
    action: "workspaces.write",
    role,
    customPermissionDescription: "manage site visit tracking",
  }).error;

  const trackedSitemapRows = Array.isArray(trackedSitemaps)
    ? trackedSitemaps
        .map((sitemap) => {
          if (!sitemap?.url) {
            return null;
          }

          return {
            url: sitemap.url,
            lastCrawledAt: sitemap.lastCrawledAt
              ? new Date(sitemap.lastCrawledAt)
              : null,
            lastUrlCount:
              typeof sitemap.lastUrlCount === "number"
                ? sitemap.lastUrlCount
                : null,
          };
        })
        .filter(
          (
            sitemap,
          ): sitemap is {
            url: string;
            lastCrawledAt: Date | null;
            lastUrlCount: number | null;
          } => Boolean(sitemap),
        )
    : [];

  const sitemaps = siteVisitTrackingEnabled
    ? trackedSitemapRows
    : [
        {
          url: "dub.co/sitemap.xml",
          lastCrawledAt: new Date(),
          lastUrlCount: null,
        },
      ];

  const normalizeSitemapUrl = (value: string) => {
    const trimmed = value.trim();
    if (!trimmed) {
      return null;
    }

    const withProtocol =
      trimmed.startsWith("http://") || trimmed.startsWith("https://")
        ? trimmed
        : `https://${trimmed}`;

    try {
      return new URL(withProtocol).toString();
    } catch {
      return null;
    }
  };

  const addSitemap = async () => {
    if (permissionsError) {
      toast.error(permissionsError);
      return;
    }

    if (!id) {
      toast.error("Workspace is still loading. Please try again.");
      return;
    }

    const normalizedSitemapUrl = normalizeSitemapUrl(newSitemapUrl);

    if (!normalizedSitemapUrl) {
      toast.error("Enter a valid sitemap URL.");
      return;
    }

    const sitemapAlreadyExists = sitemaps.some(
      (sitemap) => sitemap.url === normalizedSitemapUrl,
    );

    if (sitemapAlreadyExists) {
      toast.error("Sitemap already exists.");
      return;
    }

    setAddingSitemap(true);

    const response = await fetch(`/api/workspaces/${id}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        trackedSitemaps: [
          ...sitemaps.map((sitemap) => ({
            url: sitemap.url,
            ...(sitemap.lastCrawledAt
              ? { lastCrawledAt: sitemap.lastCrawledAt.toISOString() }
              : {}),
            ...(typeof sitemap.lastUrlCount === "number"
              ? { lastUrlCount: sitemap.lastUrlCount }
              : {}),
          })),
          {
            url: normalizedSitemapUrl,
          },
        ],
      }),
    });

    if (response.ok) {
      const importResponse = await fetch(
        `/api/workspaces/${id}/sitemaps/import`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            sitemapUrl: normalizedSitemapUrl,
          }),
        },
      );

      if (importResponse.ok) {
        toast.success("Sitemap added and crawled.");
      } else {
        const { error } = await importResponse.json();
        toast.error(error?.message || "Sitemap added, but crawl failed.");
      }

      setNewSitemapUrl("");
      mutate();
    } else {
      const { error } = await response.json();
      toast.error(error?.message || "Failed to add sitemap.");
    }

    setAddingSitemap(false);
  };

  const serializeSitemaps = (
    input: {
      url: string;
      lastCrawledAt: Date | null;
      lastUrlCount: number | null;
    }[],
  ) =>
    input.map((sitemap) => ({
      url: sitemap.url,
      ...(sitemap.lastCrawledAt
        ? { lastCrawledAt: sitemap.lastCrawledAt.toISOString() }
        : {}),
      ...(typeof sitemap.lastUrlCount === "number"
        ? { lastUrlCount: sitemap.lastUrlCount }
        : {}),
    }));

  const refreshSitemap = async (sitemapUrl: string) => {
    if (permissionsError) {
      toast.error(permissionsError);
      return;
    }

    if (!id) {
      toast.error("Workspace is still loading. Please try again.");
      return;
    }

    setRefreshingSitemapUrl(sitemapUrl);

    const response = await fetch(`/api/workspaces/${id}/sitemaps/import`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        sitemapUrl,
      }),
    });

    if (response.ok) {
      toast.success("Sitemap refreshed.");
      mutate();
    } else {
      const { error } = await response.json();
      toast.error(error?.message || "Failed to refresh sitemap.");
    }

    setRefreshingSitemapUrl(null);
  };

  const deleteSitemap = async (sitemapUrl: string) => {
    if (permissionsError) {
      toast.error(permissionsError);
      return;
    }

    if (!id) {
      toast.error("Workspace is still loading. Please try again.");
      return;
    }

    setDeletingSitemapUrl(sitemapUrl);

    const remainingSitemaps = sitemaps.filter(
      (sitemap) => sitemap.url !== sitemapUrl,
    );

    const response = await fetch(`/api/workspaces/${id}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        trackedSitemaps: serializeSitemaps(remainingSitemaps),
      }),
    });

    if (response.ok) {
      toast.success("Sitemap deleted.");
      mutate();
    } else {
      const { error } = await response.json();
      toast.error(error?.message || "Failed to delete sitemap.");
    }

    setDeletingSitemapUrl(null);
  };

  return (
    <div className="flex flex-1 flex-col rounded-lg border border-neutral-200 bg-neutral-50">
      <div className="flex items-center justify-between gap-4 p-3">
        <div className="flex min-w-0 items-center gap-4">
          <div className="overflow-hidden">
            <label
              htmlFor={`${switchId}-switch`}
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
          {...(permissionsError
            ? {
                disabledTooltip: permissionsError,
                thumbIcon: (
                  <div className="flex size-full items-center justify-center">
                    <LockSmall className="size-[8px] text-black" />
                  </div>
                ),
              }
            : {})}
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
            <div className="flex w-full items-center gap-2 sm:w-auto">
              {siteVisitTrackingEnabled && (
                <input
                  type="text"
                  value={newSitemapUrl}
                  onChange={(e) => setNewSitemapUrl(e.target.value)}
                  placeholder="e.g. www.acme.com/sitemap.xml"
                  className="h-7 w-full rounded-lg border border-neutral-300 px-2.5 text-sm focus:border-neutral-500 focus:outline-none focus:ring-0 sm:w-[260px]"
                />
              )}
              <Button
                text="Add sitemap"
                className="h-7 w-fit rounded-lg px-2.5 py-1 text-sm font-medium"
                onClick={() =>
                  siteVisitTrackingEnabled
                    ? addSitemap()
                    : toast.info("Coming soon")
                }
                loading={addingSitemap}
                disabledTooltip={permissionsError || undefined}
              />
            </div>
          </div>

          <div className="flex flex-col gap-2">
            {siteVisitTrackingEnabled && sitemaps.length === 0 ? (
              <div className="text-content-subtle rounded-xl border border-dashed border-neutral-300 bg-white p-3 text-sm">
                No tracked sitemaps configured yet.
              </div>
            ) : (
              sitemaps.map((sitemap) => (
                <div
                  key={sitemap.url}
                  className="border-border-subtle flex items-center justify-between gap-4 rounded-xl border bg-white p-3"
                >
                  <div className="flex min-w-0 items-center gap-2">
                    <div className="flex size-[28px] items-center justify-center rounded-md bg-neutral-100">
                      <Sitemap className="size-4 text-neutral-800" />
                    </div>
                    <div className="flex min-w-0 flex-col">
                      <span className="text-content-emphasis min-w-0 truncate text-sm font-semibold">
                        {sitemap.url}
                      </span>
                      <span className="text-content-subtle text-xs font-medium">
                        {sitemap.lastCrawledAt
                          ? `Last crawled ${formatDate(sitemap.lastCrawledAt)}`
                          : "Not crawled yet"}
                        {sitemap.lastUrlCount !== null
                          ? ` · ${sitemap.lastUrlCount} URLs found`
                          : ""}
                      </span>
                    </div>
                  </div>
                  {siteVisitTrackingEnabled && (
                    <SitemapRowMenu
                      onRefresh={() => refreshSitemap(sitemap.url)}
                      onDelete={() => deleteSitemap(sitemap.url)}
                      loading={
                        refreshingSitemapUrl === sitemap.url ||
                        deletingSitemapUrl === sitemap.url
                      }
                    />
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      </motion.div>
    </div>
  );
}

function SitemapRowMenu({
  onRefresh,
  onDelete,
  loading,
}: {
  onRefresh: () => void;
  onDelete: () => void;
  loading: boolean;
}) {
  const [openPopover, setOpenPopover] = useState(false);

  return (
    <Popover
      content={
        <div className="w-full sm:w-48">
          <div className="grid gap-px p-2">
            <Button
              text="Refresh source"
              variant="outline"
              onClick={() => {
                setOpenPopover(false);
                onRefresh();
              }}
              icon={<RefreshCw className="h-4 w-4" />}
              className="h-9 justify-start px-2 font-medium"
            />
          </div>
          <div className="border-t border-neutral-200" />
          <div className="grid gap-px p-2">
            <Button
              text="Delete source"
              variant="danger-outline"
              onClick={() => {
                setOpenPopover(false);
                onDelete();
              }}
              icon={<Trash className="size-4" />}
              className="h-9 justify-start px-2 font-medium"
            />
          </div>
        </div>
      }
      align="end"
      openPopover={openPopover}
      setOpenPopover={setOpenPopover}
    >
      <Button
        variant="outline"
        className={cn(
          "h-8 w-fit px-1.5 outline-none transition-all duration-200",
          "border-transparent data-[state=open]:border-neutral-500 sm:group-hover/card:data-[state=closed]:border-neutral-200",
        )}
        icon={
          loading ? (
            <LoadingSpinner className="size-4 shrink-0" />
          ) : (
            <ThreeDots className="size-5 shrink-0" />
          )
        }
        onClick={() => setOpenPopover(!openPopover)}
      />
    </Popover>
  );
}
