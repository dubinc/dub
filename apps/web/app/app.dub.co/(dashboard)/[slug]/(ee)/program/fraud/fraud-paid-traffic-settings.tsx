"use client";

import { PAID_TRAFFIC_PLATFORMS_CONFIG } from "@/lib/api/fraud/constants";
import { PaidTrafficPlatform } from "@/lib/types";
import { updateFraudRuleSettingsSchema } from "@/lib/zod/schemas/fraud";
import { X } from "@/ui/shared/icons";
import {
  Bing,
  Button,
  Facebook,
  Google,
  LinkedIn,
  Reddit,
  Switch,
  TikTok,
  Twitter,
} from "@dub/ui";
import { cn } from "@dub/utils/src";
import React from "react";
import { useFormContext } from "react-hook-form";
import * as z from "zod/v4";

type FormData = z.infer<
  typeof updateFraudRuleSettingsSchema.shape.paidTrafficDetected
>;

const PAID_TRAFFIC_PLATFORM_ICONS: Record<
  PaidTrafficPlatform,
  React.ComponentType<{ className?: string }>
> = {
  google: Google,
  facebook: Facebook,
  x: Twitter,
  bing: Bing,
  linkedin: LinkedIn,
  reddit: Reddit,
  tiktok: TikTok,
};

interface FraudPaidTrafficSettingsProps {
  isConfigLoading?: boolean;
}

export function FraudPaidTrafficSettings({
  isConfigLoading = false,
}: FraudPaidTrafficSettingsProps) {
  const {
    watch,
    setValue,
    formState: { isSubmitting },
  } = useFormContext<{ paidTrafficDetected: FormData }>();

  const platforms = watch("paidTrafficDetected.config.platforms") ?? [];
  const whitelistedCampaignIds =
    watch("paidTrafficDetected.config.google.whitelistedCampaignIds") ?? [];

  const enabled = watch("paidTrafficDetected.enabled");
  const isGoogleEnabled = platforms.includes("google");

  // Toggle platform in the list
  const togglePlatform = (platformId: string) => {
    const isSelected = platforms.includes(platformId as any);
    const newPlatforms = isSelected
      ? platforms.filter((p) => p !== platformId)
      : [...platforms, platformId as any];

    setValue("paidTrafficDetected.config.platforms", newPlatforms, {
      shouldDirty: true,
    });

    if (platformId === "google" && isSelected) {
      setValue("paidTrafficDetected.config.google.whitelistedCampaignIds", [], {
        shouldDirty: true,
      });
    }
  };

  const addCampaignId = (id: string) => {
    const trimmed = id.trim();
    if (trimmed && !whitelistedCampaignIds.includes(trimmed)) {
      setValue(
        "paidTrafficDetected.config.google.whitelistedCampaignIds",
        [...whitelistedCampaignIds, trimmed],
        { shouldDirty: true },
      );
    }
  };

  const removeCampaignId = (id: string) => {
    setValue(
      "paidTrafficDetected.config.google.whitelistedCampaignIds",
      whitelistedCampaignIds.filter((c) => c !== id),
      { shouldDirty: true },
    );
  };

  const isDisabled = isConfigLoading || isSubmitting;

  return (
    <div
      className={cn(
        "rounded-xl border border-neutral-200",
        enabled && "divide-y divide-neutral-200",
      )}
    >
      <div className="flex items-center justify-between p-3">
        <div className="flex-1">
          <h3 className="text-sm font-semibold text-neutral-900">
            Paid traffic
          </h3>
          <p className="text-content-subtle mt-0.5 text-xs font-normal tracking-normal">
            Flag paid advertising traffic
          </p>
        </div>
        <Switch
          trackDimensions="radix-state-checked:bg-black focus-visible:ring-black/20"
          checked={enabled}
          disabled={isDisabled}
          fn={(enabled: boolean) => {
            setValue("paidTrafficDetected.enabled", enabled, {
              shouldDirty: true,
            });

            // Reset the platforms if the rule is disabled
            if (!enabled) {
              setValue("paidTrafficDetected.config.platforms", [], {
                shouldDirty: true,
              });
              setValue(
                "paidTrafficDetected.config.google.whitelistedCampaignIds",
                [],
                { shouldDirty: true },
              );
            }
          }}
        />
      </div>

      {enabled && (
        <>
          <div className="space-y-1 p-1">
            {PAID_TRAFFIC_PLATFORMS_CONFIG.map((platform) => {
              const Icon = PAID_TRAFFIC_PLATFORM_ICONS[platform.id];
              const isPlatformEnabled = platforms.includes(platform.id);

              return (
                <div
                  key={platform.id}
                  className="group flex items-center justify-between rounded-lg px-2 py-2.5 transition-colors hover:cursor-pointer hover:bg-neutral-100"
                >
                  <div className="flex items-center gap-3">
                    {Icon && (
                      <div className="flex h-5 w-5 items-center justify-center">
                        <Icon className="h-5 w-5" />
                      </div>
                    )}
                    <span className="text-sm font-medium text-neutral-900">
                      {platform.name}
                    </span>
                  </div>
                  <Switch
                    trackDimensions="radix-state-checked:bg-black focus-visible:ring-black/20"
                    checked={isPlatformEnabled}
                    disabled={isDisabled}
                    fn={() => togglePlatform(platform.id)}
                  />
                </div>
              );
            })}
          </div>

          {isGoogleEnabled && (
            <div className="space-y-3 border-t border-neutral-200 bg-neutral-50/50 p-4">
              <label className="text-sm font-medium text-neutral-700">
                Google campaign whitelist
                <span className="ml-1 font-normal text-neutral-500">
                  (optional)
                </span>
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="e.g. 123456789"
                  disabled={isDisabled}
                  className={cn(
                    "block h-9 flex-1 rounded-md border-neutral-300 px-3 py-1.5 text-sm text-neutral-900 placeholder-neutral-400 focus:border-neutral-500 focus:outline-none focus:ring-neutral-500 disabled:bg-neutral-100 disabled:text-neutral-500",
                  )}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      const input = e.currentTarget;
                      addCampaignId(input.value);
                      input.value = "";
                    }
                  }}
                />
                <Button
                  type="button"
                  variant="secondary"
                  text="Add"
                  className="h-9 w-fit px-3"
                  disabled={isDisabled}
                  onClick={(e) => {
                    const input = e.currentTarget
                      .previousElementSibling as HTMLInputElement;
                    if (input) {
                      addCampaignId(input.value);
                      input.value = "";
                    }
                  }}
                />
              </div>
              {whitelistedCampaignIds.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {whitelistedCampaignIds.map((id) => (
                    <div
                      key={id}
                      className="flex items-center gap-1.5 rounded-md bg-neutral-100 px-2.5 py-1.5 text-sm text-neutral-700"
                    >
                      <span>{id}</span>
                      <button
                        type="button"
                        onClick={() => removeCampaignId(id)}
                        disabled={isDisabled}
                        className="text-neutral-400 hover:text-neutral-600"
                      >
                        <X className="size-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
              <p className="text-content-subtle text-xs font-normal tracking-normal">
                Skip the fraud event when the campaign ID matches one of the
                predefined IDs.
              </p>
            </div>
          )}
        </>
      )}
    </div>
  );
}
