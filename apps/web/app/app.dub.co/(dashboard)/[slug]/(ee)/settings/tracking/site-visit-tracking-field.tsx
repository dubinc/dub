"use client";

import { MAX_TRACKED_SITEMAPS_PER_WORKSPACE } from "@/lib/zod/schemas/site-visit-tracking";
import { DomainSelector } from "@/ui/domains/domain-selector";
import { ThreeDots } from "@/ui/shared/icons";
import { Button, InfoTooltip, LoadingSpinner, Popover, Sitemap } from "@dub/ui";
import { Trash } from "@dub/ui/icons";
import { cn, formatDate } from "@dub/utils";
import { RefreshCw } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { useAddSitemapModal } from "./add-sitemap-modal";
import { EnableSwitch } from "./enable-switch";
import { TrackedSitemapDraft } from "./tracking-form";

export function SiteVisitTrackingField({
  enabled,
  onEnabledChange,
  siteDomainSlug,
  onSiteDomainSlugChange,
  sitemaps,
  onSitemapsChange,
  persistedSitemapUrls,
  workspaceId,
  onSitemapRefreshed,
  disabled,
  disabledTooltip,
}: {
  enabled: boolean;
  onEnabledChange: (enabled: boolean) => void;
  siteDomainSlug: string;
  onSiteDomainSlugChange: (slug: string) => void;
  sitemaps: TrackedSitemapDraft[];
  onSitemapsChange: (sitemaps: TrackedSitemapDraft[]) => void;
  persistedSitemapUrls: string[];
  workspaceId?: string;
  onSitemapRefreshed?: () => void;
  disabled?: boolean;
  disabledTooltip?: string;
}) {
  const [refreshingSitemapUrl, setRefreshingSitemapUrl] = useState<
    string | null
  >(null);

  const addSitemap = (normalizedSitemapUrl: string) => {
    if (disabled) {
      return;
    }

    if (!siteDomainSlug) {
      toast.error("Choose a domain for sitemap imports before adding sources.");
      return;
    }

    if (sitemaps.some((sitemap) => sitemap.url === normalizedSitemapUrl)) {
      toast.error("Sitemap already exists.");
      return;
    }

    if (sitemaps.length >= MAX_TRACKED_SITEMAPS_PER_WORKSPACE) {
      toast.error(
        `You can track up to ${MAX_TRACKED_SITEMAPS_PER_WORKSPACE} sitemaps per workspace.`,
      );
      return;
    }

    onSitemapsChange([
      ...sitemaps,
      {
        url: normalizedSitemapUrl,
      },
    ]);
  };

  const { AddSitemapModal, setShowAddSitemapModal } = useAddSitemapModal({
    existingUrls: sitemaps.map((sitemap) => sitemap.url),
    onAdd: addSitemap,
  });

  const refreshSitemap = async (sitemapUrl: string) => {
    if (!workspaceId) {
      toast.error("Workspace is still loading. Please try again.");
      return;
    }

    setRefreshingSitemapUrl(sitemapUrl);

    try {
      const response = await fetch(
        `/api/workspaces/${workspaceId}/sitemaps/import`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            sitemapUrl,
          }),
        },
      );

      if (response.ok) {
        toast.success("Sitemap refreshed.");
        onSitemapRefreshed?.();
      } else {
        const { error } = await response.json();
        toast.error(error?.message || "Failed to refresh sitemap.");
      }
    } catch {
      toast.error("Network error, please try again.");
    } finally {
      setRefreshingSitemapUrl(null);
    }
  };

  const addSitemapDisabledReason = disabledTooltip
    ? disabledTooltip
    : !siteDomainSlug
      ? "Choose a domain for imports first"
      : sitemaps.length >= MAX_TRACKED_SITEMAPS_PER_WORKSPACE
        ? `Maximum ${MAX_TRACKED_SITEMAPS_PER_WORKSPACE} sitemaps per workspace`
        : undefined;

  return (
    <>
      <div className="flex flex-col gap-4">
        <EnableSwitch
          checked={enabled}
          onChange={onEnabledChange}
          disabled={disabled}
          disabledTooltip={disabledTooltip}
        />

        {enabled && (
          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-2">
              <label className="text-content-emphasis text-sm font-semibold">
                Domain for sitemap imports
              </label>
              <DomainSelector
                selectedDomain={siteDomainSlug}
                setSelectedDomain={onSiteDomainSlugChange}
                disabled={disabled}
                disabledTooltip={disabledTooltip}
              />
              <p className="text-content-subtle text-xs font-medium">
                This domain will be used for links we create when importing
                pages from the sitemaps you add.
              </p>
            </div>

            <div className="flex flex-col gap-2">
              <h4 className="text-content-emphasis flex items-center gap-1 text-sm font-semibold">
                Sitemaps
                <InfoTooltip content="Add sitemap URLs we should crawl to create links for site visit tracking." />
              </h4>

              {sitemaps.length > 0 && (
                <div className="flex flex-col gap-2">
                  {sitemaps.map((sitemap) => (
                    <div
                      key={sitemap.url}
                      className="flex items-center justify-between gap-4 rounded-xl border border-neutral-200 bg-white p-3"
                    >
                      <div className="flex min-w-0 items-center gap-2">
                        <div className="flex size-7 items-center justify-center rounded-md bg-neutral-100">
                          <Sitemap className="size-4 text-neutral-800" />
                        </div>
                        <div className="flex min-w-0 flex-col">
                          <span className="text-content-emphasis min-w-0 truncate text-sm font-semibold">
                            {sitemap.url.replace(/^https?:\/\//, "")}
                          </span>
                          <span className="text-content-subtle text-xs font-medium">
                            {sitemap.lastCrawledAt
                              ? `Last crawled ${formatDate(sitemap.lastCrawledAt, { month: "short" })}`
                              : "Not crawled yet"}
                            {typeof sitemap.lastUrlCount === "number"
                              ? ` • ${sitemap.lastUrlCount} URLs found`
                              : ""}
                          </span>
                        </div>
                      </div>
                      {!disabled && (
                        <SitemapRowMenu
                          canRefresh={persistedSitemapUrls.includes(
                            sitemap.url,
                          )}
                          onRefresh={() => refreshSitemap(sitemap.url)}
                          onDelete={() =>
                            onSitemapsChange(
                              sitemaps.filter(
                                (item) => item.url !== sitemap.url,
                              ),
                            )
                          }
                          loading={refreshingSitemapUrl === sitemap.url}
                        />
                      )}
                    </div>
                  ))}
                </div>
              )}

              <Button
                text="Add sitemap"
                variant="secondary"
                className="h-8 w-fit px-2.5"
                onClick={() => setShowAddSitemapModal(true)}
                disabled={disabled || Boolean(addSitemapDisabledReason)}
                disabledTooltip={addSitemapDisabledReason}
              />
            </div>
          </div>
        )}
      </div>
      <AddSitemapModal />
    </>
  );
}

function SitemapRowMenu({
  canRefresh,
  onRefresh,
  onDelete,
  loading,
}: {
  canRefresh: boolean;
  onRefresh: () => void;
  onDelete: () => void;
  loading: boolean;
}) {
  const [openPopover, setOpenPopover] = useState(false);

  return (
    <Popover
      content={
        <div className="w-full sm:w-48">
          {canRefresh && (
            <>
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
            </>
          )}
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
          "border-transparent data-[state=open]:border-neutral-500",
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
