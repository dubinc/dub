"use client";

import { updateFraudRuleSettingsSchema } from "@/lib/zod/schemas/fraud";
import { X } from "@/ui/shared/icons";
import { Button, Switch } from "@dub/ui";
import { cn } from "@dub/utils/src";
import { useFormContext } from "react-hook-form";
import * as z from "zod/v4";

type FormData = z.infer<
  typeof updateFraudRuleSettingsSchema.shape.referralSourceBanned
>;

interface FraudReferralSourceSettingsProps {
  isConfigLoading?: boolean;
}

export function FraudReferralSourceSettings({
  isConfigLoading = false,
}: FraudReferralSourceSettingsProps) {
  const {
    watch,
    setValue,
    formState: { isSubmitting },
  } = useFormContext<{ referralSourceBanned: FormData }>();

  const domains = watch("referralSourceBanned.config.domains") ?? [];
  const enabled = watch("referralSourceBanned.enabled");

  // Add empty domain row to the list
  const addDomain = () => {
    setValue("referralSourceBanned.config.domains", [...(domains ?? []), ""], {
      shouldDirty: true,
    });
  };

  // Update domain at specific index
  const updateDomain = (index: number, value: string) => {
    const newDomains = [...domains];
    newDomains[index] = value;
    setValue("referralSourceBanned.config.domains", newDomains, {
      shouldDirty: true,
    });
  };

  // Remove domain from the list
  const removeDomain = (index: number) => {
    setValue(
      "referralSourceBanned.config.domains",
      domains.filter((_, i) => i !== index),
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
            Referral source
          </h3>
          <p className="text-content-subtle mt-0.5 text-xs font-normal tracking-normal">
            Flag specific domains for referral traffic
          </p>
        </div>
        <Switch
          trackDimensions="radix-state-checked:bg-black focus-visible:ring-black/20"
          checked={enabled}
          disabled={isDisabled}
          fn={(enabled: boolean) => {
            setValue("referralSourceBanned.enabled", enabled, {
              shouldDirty: true,
            });

            // Reset the domains if the rule is disabled
            if (!enabled) {
              setValue("referralSourceBanned.config.domains", [], {
                shouldDirty: true,
              });
            }

            if (enabled && domains.length === 0) {
              addDomain();
            }
          }}
        />
      </div>

      {enabled && (
        <div className="space-y-3 p-3">
          <div className="space-y-2">
            {domains.map((domain, index) => (
              <div key={index} className="group relative w-full">
                <input
                  type="text"
                  placeholder="reddit.com"
                  value={domain}
                  disabled={isDisabled}
                  onChange={(e) => updateDomain(index, e.target.value)}
                  className={cn(
                    "w-full rounded-lg border border-neutral-300 py-2 pl-3 pr-11 text-sm text-neutral-900 placeholder-neutral-400 focus:border-neutral-500 focus:outline-none focus:ring-neutral-500 disabled:bg-neutral-100 disabled:text-neutral-500",
                  )}
                />
                <button
                  type="button"
                  onClick={() => removeDomain(index)}
                  disabled={isDisabled}
                  className="absolute inset-y-0 right-0 my-1 mr-1 flex h-[calc(100%-0.5rem)] items-center justify-center rounded-md bg-neutral-100 px-3 py-2 text-neutral-500 opacity-0 transition-opacity hover:bg-neutral-200 hover:text-neutral-700 focus:outline-none focus-visible:opacity-100 focus-visible:ring-2 focus-visible:ring-neutral-500 focus-visible:ring-offset-2 disabled:opacity-50 group-hover:opacity-100"
                  aria-label="Remove domain"
                >
                  <X className="size-2.5 text-neutral-600" />
                </button>
              </div>
            ))}
          </div>

          <div className="flex gap-2">
            <Button
              text="Add domain"
              onClick={addDomain}
              disabled={isDisabled}
              className="h-8"
            />
          </div>

          <p className="text-content-subtle text-center text-xs font-normal tracking-normal">
            Use{" "}
            <span className="justify-center rounded-md bg-neutral-100 px-1 py-0.5">
              *
            </span>{" "}
            to match any part of a domain.{" "}
            <a
              href="https://dub.co/help"
              target="_blank"
              rel="noopener noreferrer"
              className="leading-none underline underline-offset-2 hover:text-neutral-800"
            >
              Learn more
            </a>
          </p>
        </div>
      )}
    </div>
  );
}
