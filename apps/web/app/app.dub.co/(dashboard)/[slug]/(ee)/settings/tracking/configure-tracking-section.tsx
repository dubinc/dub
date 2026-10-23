"use client";

import { clientAccessCheck } from "@/lib/client-access-check";
import useWorkspace from "@/lib/swr/use-workspace";
import { useWorkspaceStore } from "@/lib/swr/use-workspace-store";
import { stackItems } from "@/ui/guides/integrations";
import { Button, Switch } from "@dub/ui";
import { useEffect, useMemo } from "react";
import { Controller, useForm } from "react-hook-form";
import { toast } from "sonner";
import { HostnameField } from "./hostname-field";
import { PublishableKeyField } from "./publishable-key-field";
import { SectionCard } from "./section-card";
import {
  SiteVisitTrackingField,
  TrackedSitemapDraft,
} from "./site-visit-tracking-field";
import { StackPicker, StackSelectionStatus } from "./stack-picker";
import { TrackingSettingsRow } from "./tracking-settings-row";

type TrackingFormData = {
  stack: string[];
  allowedHostnames: string[];
  publishableKey: string | null;
  siteVisitTrackingEnabled: boolean;
  siteDomainSlug: string;
  trackedSitemaps: TrackedSitemapDraft[];
  outboundDomainTrackingEnabled: boolean;
};

const emptyTrackingFormValues: TrackingFormData = {
  stack: [],
  allowedHostnames: [],
  publishableKey: null,
  siteVisitTrackingEnabled: false,
  siteDomainSlug: "",
  trackedSitemaps: [],
  outboundDomainTrackingEnabled: false,
};

const STACK_DESCRIPTION =
  "Select all items that apply to your stack. [Learn more](https://dub.co/docs/conversions/quickstart)";
const HOSTNAMES_DESCRIPTION =
  "Domains to allow client-side click tracking for. [Learn more](https://dub.co/docs/sdks/client-side/features/click-tracking)";
const PUBLISHABLE_KEY_DESCRIPTION =
  "Required for client-side conversion tracking. [Learn more](https://dub.co/docs/api-reference/publishable-keys)";
const SITE_VISIT_DESCRIPTION =
  "For tracking site visits (organic visits from Google/SEO/AEO). [Learn more](https://dub.co/docs/concepts/attribution)";
const OUTBOUND_DESCRIPTION =
  "Track outbound clicks to your other domains. [Learn more](https://dub.co/docs/sdks/client-side/features/cross-domain-tracking#cross-domain-tracking)";

export function ConfigureTrackingSection() {
  const workspace = useWorkspace();
  const {
    id,
    role,
    flags,
    mutate,
    loading: workspaceLoading,
    allowedHostnames,
    publishableKey,
    siteVisitTrackingSettings,
  } = workspace;

  const permissionsError = clientAccessCheck({
    action: "workspaces.write",
    role,
    customPermissionDescription: "manage tracking settings",
  }).error;
  const disabledTooltip =
    typeof permissionsError === "string" ? permissionsError : undefined;

  const [savedStack, setSavedStack, { loading: stackLoading }] =
    useWorkspaceStore<string[]>("analyticsSettingsSelectedStack");
  const [siteVisitEnabled, setSiteVisitEnabled] = useWorkspaceStore<boolean>(
    "analyticsSettingsSiteVisitTrackingEnabled",
  );
  const [outboundEnabled, setOutboundEnabled] = useWorkspaceStore<boolean>(
    "analyticsSettingsOutboundDomainTrackingEnabled",
  );
  const [, setConversionEnabled] = useWorkspaceStore<boolean>(
    "analyticsSettingsConversionTrackingEnabled",
  );
  const [, setConnectionComplete] = useWorkspaceStore<boolean>(
    "analyticsSettingsConnectionSetupComplete",
  );

  const persistedSitemaps = useMemo(
    () =>
      (siteVisitTrackingSettings?.trackedSitemaps ?? [])
        .filter((sitemap) => sitemap?.url)
        .map((sitemap) => ({
          url: sitemap.url,
          ...(sitemap.lastCrawledAt
            ? { lastCrawledAt: sitemap.lastCrawledAt }
            : {}),
          ...(typeof sitemap.lastUrlCount === "number"
            ? { lastUrlCount: sitemap.lastUrlCount }
            : {}),
        })),
    [siteVisitTrackingSettings],
  );

  const defaultValues = useMemo<TrackingFormData>(
    () => ({
      stack: savedStack ?? [],
      allowedHostnames: allowedHostnames ?? [],
      publishableKey: publishableKey ?? null,
      siteVisitTrackingEnabled: Boolean(siteVisitEnabled),
      siteDomainSlug: siteVisitTrackingSettings?.siteDomainSlug ?? "",
      trackedSitemaps: persistedSitemaps,
      outboundDomainTrackingEnabled: Boolean(outboundEnabled),
    }),
    [
      savedStack,
      allowedHostnames,
      publishableKey,
      siteVisitEnabled,
      siteVisitTrackingSettings?.siteDomainSlug,
      persistedSitemaps,
      outboundEnabled,
    ],
  );

  const {
    control,
    handleSubmit,
    reset,
    watch,
    setValue,
    formState: { isDirty, isSubmitting },
  } = useForm<TrackingFormData>({
    defaultValues: emptyTrackingFormValues,
  });

  const loading = Boolean(workspaceLoading || stackLoading);

  useEffect(() => {
    if (loading || isDirty) {
      return;
    }

    reset(defaultValues);
  }, [loading, isDirty, defaultValues, reset]);

  const persistedSitemapUrls = persistedSitemaps.map((sitemap) => sitemap.url);
  const disabled = Boolean(permissionsError) || loading;
  const selectedStack = watch("stack") ?? [];

  const onSubmit = async (data: TrackingFormData) => {
    if (!id) {
      toast.error("Workspace is still loading. Please try again.");
      return;
    }

    try {
      const response = await fetch(`/api/workspaces/${id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          allowedHostnames: data.allowedHostnames,
          publishableKey: data.publishableKey,
          ...(flags?.analyticsSettingsSiteVisitTracking
            ? {
                siteVisitTrackingSettings: {
                  trackedSitemaps: data.trackedSitemaps,
                  siteDomainSlug: data.siteDomainSlug || null,
                },
              }
            : {}),
        }),
      });

      if (!response.ok) {
        const { error } = await response.json();
        toast.error(error?.message || "Failed to save settings.");
        return;
      }

      await setSavedStack(data.stack);
      await setSiteVisitEnabled(data.siteVisitTrackingEnabled);
      await setOutboundEnabled(data.outboundDomainTrackingEnabled);

      if (data.publishableKey) {
        await setConversionEnabled(true);
      }

      if (data.allowedHostnames.length > 0 && data.stack.length > 0) {
        await setConnectionComplete(true);
      }

      const existingUrls = new Set(persistedSitemapUrls);
      const newSitemaps = data.trackedSitemaps.filter(
        (sitemap) => !existingUrls.has(sitemap.url),
      );

      for (const sitemap of newSitemaps) {
        const importResponse = await fetch(
          `/api/workspaces/${id}/sitemaps/import`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              sitemapUrl: sitemap.url,
            }),
          },
        );

        if (!importResponse.ok) {
          try {
            const { error } = await importResponse.json();
            toast.error(error?.message || "Sitemap added, but crawl failed.");
          } catch {
            toast.error("Sitemap added, but crawl failed.");
          }
        }
      }

      await mutate();
      reset(data);
      toast.success("Tracking settings saved.");
    } catch {
      toast.error("Network error, please try again.");
    }
  };

  return (
    <SectionCard number={1} title="Configure tracking">
      <form onSubmit={handleSubmit(onSubmit)}>
        <div className="divide-y divide-neutral-200">
          <TrackingSettingsRow
            heading="Stack"
            description={STACK_DESCRIPTION}
            leftExtra={
              selectedStack.length > 0 ? (
                <StackSelectionStatus count={selectedStack.length} />
              ) : undefined
            }
            leftExtraAlign="end"
          >
            <Controller
              control={control}
              name="stack"
              render={({ field }) => (
                <StackPicker
                  items={stackItems}
                  value={field.value}
                  onChange={field.onChange}
                  disabled={disabled}
                />
              )}
            />
          </TrackingSettingsRow>

          <TrackingSettingsRow
            heading="Allowed hostnames"
            description={HOSTNAMES_DESCRIPTION}
          >
            <Controller
              control={control}
              name="allowedHostnames"
              render={({ field }) => (
                <HostnameField
                  hostnames={field.value}
                  onChange={field.onChange}
                  onSave={(allowedHostnames) =>
                    handleSubmit((data) =>
                      onSubmit({ ...data, allowedHostnames }),
                    )()
                  }
                  disabled={disabled}
                  disabledTooltip={disabledTooltip}
                />
              )}
            />
          </TrackingSettingsRow>

          <TrackingSettingsRow
            heading="Publishable key"
            description={PUBLISHABLE_KEY_DESCRIPTION}
          >
            <Controller
              control={control}
              name="publishableKey"
              render={({ field }) => (
                <PublishableKeyField
                  publishableKey={field.value}
                  onChange={field.onChange}
                  disabled={disabled}
                  disabledTooltip={disabledTooltip}
                />
              )}
            />
          </TrackingSettingsRow>

          {flags?.analyticsSettingsSiteVisitTracking && (
            <TrackingSettingsRow
              heading="Site visit tracking"
              description={SITE_VISIT_DESCRIPTION}
            >
              <SiteVisitTrackingField
                enabled={watch("siteVisitTrackingEnabled")}
                onEnabledChange={(enabled) =>
                  setValue("siteVisitTrackingEnabled", enabled, {
                    shouldDirty: true,
                  })
                }
                siteDomainSlug={watch("siteDomainSlug")}
                onSiteDomainSlugChange={(slug) =>
                  setValue("siteDomainSlug", slug, { shouldDirty: true })
                }
                sitemaps={watch("trackedSitemaps")}
                onSitemapsChange={(sitemaps) =>
                  setValue("trackedSitemaps", sitemaps, { shouldDirty: true })
                }
                persistedSitemapUrls={persistedSitemapUrls}
                workspaceId={id}
                onSitemapRefreshed={() => void mutate()}
                disabled={disabled}
                disabledTooltip={disabledTooltip}
              />
            </TrackingSettingsRow>
          )}

          <TrackingSettingsRow
            heading="Outbound domain tracking"
            description={OUTBOUND_DESCRIPTION}
            align="center"
          >
            <label className="flex w-fit cursor-pointer items-center gap-2">
              <Switch
                checked={watch("outboundDomainTrackingEnabled")}
                fn={(enabled) =>
                  setValue("outboundDomainTrackingEnabled", enabled, {
                    shouldDirty: true,
                  })
                }
                disabled={disabled}
                disabledTooltip={disabledTooltip}
              />
              <span className="text-content-default text-sm font-medium">
                Enable
              </span>
            </label>
          </TrackingSettingsRow>
        </div>

        <div className="flex h-16 items-center justify-end border-t border-neutral-200 bg-neutral-50 px-5 py-4">
          <Button
            text="Save changes"
            className="h-8 w-fit px-3"
            loading={isSubmitting}
            disabled={!isDirty || loading}
            disabledTooltip={
              disabledTooltip || (!isDirty ? "No unsaved changes" : undefined)
            }
          />
        </div>
      </form>
    </SectionCard>
  );
}
