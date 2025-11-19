"use client";

import { referralSourceBannedRule } from "@/lib/zod/schemas/fraud";
import { X } from "@/ui/shared/icons";
import { Button, Input, Switch } from "@dub/ui";
import { useState } from "react";
import { useFormContext } from "react-hook-form";
import { z } from "zod";

type FormData = z.infer<typeof referralSourceBannedRule>;

export function FraudReferralSourceSettings() {
  const [domainInput, setDomainInput] = useState("");
  const {
    watch,
    setValue,
    formState: { isSubmitting },
  } = useFormContext<FormData>();

  const domains = watch("config.domains") ?? [];

  // Add new domain to the list
  const addDomain = () => {
    const domain = domainInput.trim();

    if (!domain) return;

    setValue("config.domains", [...(domains ?? []), domain], {
      shouldDirty: true,
    });

    setDomainInput("");
  };

  // Remove domain from the list
  const removeDomain = (index: number) => {
    setValue(
      "config.domains",
      domains.filter((_, i) => i !== index),
      { shouldDirty: true },
    );
  };

  return (
    <div className="space-y-4">
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
          checked={watch("enabled")}
          disabled={isSubmitting}
          fn={(enabled: boolean) => {
            setValue("enabled", enabled, {
              shouldDirty: true,
            });
          }}
        />
      </div>

      {watch("enabled") && (
        <div className="space-y-3 pl-1">
          {domains.length > 0 && (
            <div className="space-y-2">
              {domains.map((domain, index) => (
                <div
                  key={index}
                  className="flex items-center gap-2 rounded-md border border-neutral-200 bg-white px-3 py-2"
                >
                  <span className="flex-1 text-sm text-neutral-800">
                    {domain}
                  </span>
                  <button
                    type="button"
                    onClick={() => removeDomain(index)}
                    className="flex h-5 w-5 items-center justify-center rounded-md text-neutral-400 transition-colors hover:bg-neutral-100 hover:text-neutral-600"
                    disabled={isSubmitting}
                  >
                    <X className="size-4" />
                  </button>
                </div>
              ))}
            </div>
          )}

          <div className="flex gap-2">
            <Input
              type="text"
              placeholder="https://www.domain.com"
              value={domainInput}
              onChange={(e) => setDomainInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  addDomain();
                }
              }}
              className="flex-1"
              disabled={isSubmitting}
            />
            <Button
              text="Add domain"
              onClick={addDomain}
              disabled={isSubmitting || !domainInput.trim()}
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
