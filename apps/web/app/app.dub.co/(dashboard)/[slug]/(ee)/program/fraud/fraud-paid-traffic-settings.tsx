"use client";

import { PAID_TRAFFIC_PLATFORMS_CONFIG } from "@/lib/api/fraud/constants";
import { PaidTrafficPlatform } from "@/lib/types";
import { updateFraudRuleSettingsSchema } from "@/lib/zod/schemas/fraud";
import {
  Bing,
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
import { z } from "zod";

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
  const enabled = watch("paidTrafficDetected.enabled");

  // Toggle platform in the list
  const togglePlatform = (platformId: string) => {
    const isSelected = platforms.includes(platformId as any);
    const newPlatforms = isSelected
      ? platforms.filter((p) => p !== platformId)
      : [...platforms, platformId as any];
    setValue("paidTrafficDetected.config.platforms", newPlatforms, {
      shouldDirty: true,
    });
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
            }
          }}
        />
      </div>

      {enabled && (
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
      )}
    </div>
  );
}
