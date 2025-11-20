"use client";

import { updateFraudRuleSettingsSchema } from "@/lib/zod/schemas/fraud";
import { X } from "@/ui/shared/icons";
import { Button, Input, Switch } from "@dub/ui";
import { useFormContext } from "react-hook-form";
import { z } from "zod";

type FormData = z.infer<
  typeof updateFraudRuleSettingsSchema.shape.referralSourceBanned
>;

export function FraudReferralSourceSettings() {
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

  return (
    <div className="space-y-4 rounded-lg border border-neutral-200 p-3">
      <div className="flex items-center justify-between">
        <div className="flex-1">
          <h3 className="text-sm font-medium text-neutral-800">
            Referral source
          </h3>
          <p className="text-content-subtle mt-1 text-xs font-normal tracking-normal">
            Flag specific domains for referral traffic
          </p>
        </div>
        <Switch
          trackDimensions="radix-state-checked:bg-black focus-visible:ring-black/20"
          checked={enabled}
          disabled={isSubmitting}
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
          }}
        />
      </div>

      {enabled && (
        <div className="space-y-3 pl-1">
          <div className="space-y-2">
            {domains.map((domain, index) => (
              <div key={index} className="flex items-center gap-2">
                <Input
                  type="text"
                  placeholder="https://www.domain.com"
                  value={domain}
                  className="flex-1"
                  disabled={isSubmitting}
                  onChange={(e) => updateDomain(index, e.target.value)}
                />
                <button
                  type="button"
                  onClick={() => removeDomain(index)}
                  disabled={isSubmitting}
                  className="flex h-9 w-9 items-center justify-center rounded-md text-neutral-400 transition-colors hover:bg-neutral-100 hover:text-neutral-600 focus:outline-none focus-visible:ring-2 focus-visible:ring-neutral-500 focus-visible:ring-offset-2 disabled:opacity-50"
                  aria-label="Remove domain"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>

          <div className="flex gap-2">
            <Button
              text="Add domain"
              onClick={addDomain}
              disabled={isSubmitting}
              className="h-9"
            />
          </div>

          <p className="text-content-subtle text-xs font-normal tracking-normal">
            Use * to match any part of a domain.{" "}
            <a
              href="https://dub.co/help"
              target="_blank"
              rel="noopener noreferrer"
              className="text-neutral-600 underline hover:text-neutral-800"
            >
              Learn more
            </a>
          </p>
        </div>
      )}
    </div>
  );
}
