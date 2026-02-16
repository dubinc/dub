"use client";

import {
  BOUNTY_DEFAULT_SUBMISSION_URLS,
  BOUNTY_MAX_SUBMISSION_FILES,
  BOUNTY_MAX_SUBMISSION_URLS,
} from "@/lib/constants/bounties";
import { RewardIconSquare } from "@/ui/partners/rewards/reward-icon-square";
import { X } from "@/ui/shared/icons";
import {
  InlineBadgePopover,
  InlineBadgePopoverInput,
  InlineBadgePopoverMenu,
} from "@/ui/shared/inline-badge-popover";
import { Button, ImageIcon, NumberStepper, Switch } from "@dub/ui";
import { cn, currencyFormatter } from "@dub/utils";
import { Controller } from "react-hook-form";
import { BountyAmountInput } from "./bounty-amount-input";
import { useAddEditBountyForm } from "./bounty-form-context";

const REWARD_TYPES = [
  {
    value: "flat",
    label: "flat rate",
  },
  {
    value: "custom",
    label: "custom",
  },
] as const;

export function BountyManualSubmissionCriteria() {
  const { control, watch, setValue } = useAddEditBountyForm();

  const [
    rewardDescription,
    rewardAmount,
    submissionRequirements,
    rewardType = "flat",
  ] = watch([
    "rewardDescription",
    "rewardAmount",
    "submissionRequirements",
    "rewardType",
  ]);

  const requireImage = !!submissionRequirements?.image;
  const requireUrl = !!submissionRequirements?.url;
  const imageMax = submissionRequirements?.image?.max;
  const urlMax = submissionRequirements?.url?.max;
  const urlDomains = submissionRequirements?.url?.domains ?? [];

  const updateSubmissionRequirements = (
    imageRequired: boolean,
    urlRequired: boolean,
    imageMaxCount?: number,
    urlMaxCount?: number,
    urlDomainsList?: string[],
  ) => {
    const requirements: {
      image?: { max?: number };
      url?: { max?: number; domains?: string[] };
    } = {};

    if (imageRequired) {
      requirements.image = {};

      if (imageMaxCount !== undefined) {
        requirements.image.max = imageMaxCount;
      }
    }

    if (urlRequired) {
      requirements.url = {};

      if (urlMaxCount !== undefined) {
        requirements.url.max = urlMaxCount;
      }

      if (urlDomainsList && urlDomainsList.length > 0) {
        requirements.url.domains = urlDomainsList;
      }
    }

    setValue(
      "submissionRequirements",
      Object.keys(requirements).length > 0 ? requirements : null,
      { shouldDirty: true },
    );
  };

  const handleRequireImageToggle = (checked: boolean) => {
    updateSubmissionRequirements(
      checked,
      requireUrl,
      checked ? imageMax : undefined,
      urlMax,
      urlDomains,
    );
  };

  const handleRequireUrlToggle = (checked: boolean) => {
    updateSubmissionRequirements(
      requireImage,
      checked,
      imageMax,
      checked ? urlMax : undefined,
      checked ? urlDomains : undefined,
    );
  };

  const handleImageMaxChange = (value: number) => {
    updateSubmissionRequirements(
      requireImage,
      requireUrl,
      value,
      urlMax,
      urlDomains,
    );
  };

  const handleUrlMaxChange = (value: number) => {
    updateSubmissionRequirements(
      requireImage,
      requireUrl,
      imageMax,
      value,
      urlDomains,
    );
  };

  const handleAddDomain = (domain: string) => {
    const trimmedDomain = domain.trim().toLowerCase();

    if (trimmedDomain && !urlDomains.includes(trimmedDomain)) {
      const newDomains = [...urlDomains, trimmedDomain];

      updateSubmissionRequirements(
        requireImage,
        requireUrl,
        imageMax,
        urlMax,
        newDomains,
      );
    }
  };

  const handleRemoveDomain = (domain: string) => {
    const newDomains = urlDomains.filter((d) => d !== domain);

    updateSubmissionRequirements(
      requireImage,
      requireUrl,
      imageMax,
      urlMax,
      newDomains,
    );
  };

  return (
    <>
      <div className="space-y-4">
        <div className="flex items-center gap-4">
          <Switch
            fn={handleRequireImageToggle}
            checked={requireImage}
            trackDimensions="w-8 h-4"
            thumbDimensions="w-3 h-3"
            thumbTranslate="translate-x-4"
          />
          <span className="text-sm font-medium text-neutral-700">
            Require at least one image
          </span>
        </div>

        <div className="flex items-center gap-4">
          <Switch
            fn={handleRequireUrlToggle}
            checked={requireUrl}
            trackDimensions="w-8 h-4"
            thumbDimensions="w-3 h-3"
            thumbTranslate="translate-x-4"
          />
          <span className="text-sm font-medium text-neutral-700">
            Require at least one URL
          </span>
        </div>
      </div>

      {(requireImage || requireUrl) && (
        <div className="space-y-4">
          {requireImage && (
            <div className="space-y-3 rounded-lg border border-neutral-200 bg-neutral-50/50 p-4">
              <label className="text-sm font-medium text-neutral-700">
                Maximum images
                <span className="ml-1 font-normal text-neutral-500">
                  (optional)
                </span>
              </label>
              <NumberStepper
                value={imageMax ?? BOUNTY_MAX_SUBMISSION_FILES}
                onChange={handleImageMaxChange}
                min={1}
                max={BOUNTY_MAX_SUBMISSION_FILES}
                step={1}
                className="h-9 w-full [&>div]:h-9"
              />
              <p className="text-xs text-neutral-500">
                Set a maximum number of images partners can submit
              </p>
            </div>
          )}

          {requireUrl && (
            <div className="space-y-4">
              <div className="space-y-3 rounded-lg border border-neutral-200 bg-neutral-50/50 p-4">
                <label className="text-sm font-medium text-neutral-700">
                  Maximum URLs
                  <span className="ml-1 font-normal text-neutral-500">
                    (optional)
                  </span>
                </label>
                <NumberStepper
                  value={urlMax ?? BOUNTY_DEFAULT_SUBMISSION_URLS}
                  onChange={handleUrlMaxChange}
                  min={1}
                  max={BOUNTY_MAX_SUBMISSION_URLS}
                  step={1}
                  className="h-9 w-full [&>div]:h-9"
                />
                <p className="text-xs text-neutral-500">
                  Set a maximum number of URLs partners can submit
                </p>
              </div>

              <div className="space-y-3 rounded-lg border border-neutral-200 bg-neutral-50/50 p-4">
                <label className="text-sm font-medium text-neutral-700">
                  Allowed domains
                  <span className="ml-1 font-normal text-neutral-500">
                    (optional)
                  </span>
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="e.g. x.com"
                    className={cn(
                      "block h-9 flex-1 rounded-md border-neutral-300 px-3 py-1.5 text-sm text-neutral-900 placeholder-neutral-400 focus:border-neutral-500 focus:outline-none focus:ring-neutral-500",
                    )}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        const input = e.currentTarget;
                        handleAddDomain(input.value);
                        input.value = "";
                      }
                    }}
                  />
                  <Button
                    type="button"
                    variant="secondary"
                    text="Add"
                    className="h-9 w-fit px-3"
                    onClick={(e) => {
                      const input = e.currentTarget
                        .previousElementSibling as HTMLInputElement;
                      if (input) {
                        handleAddDomain(input.value);
                        input.value = "";
                      }
                    }}
                  />
                </div>

                {urlDomains.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-2">
                    {urlDomains.map((domain) => (
                      <div
                        key={domain}
                        className="flex items-center gap-1.5 rounded-md bg-neutral-100 px-2.5 py-1.5 text-sm text-neutral-700"
                      >
                        <span>{domain}</span>
                        <button
                          type="button"
                          onClick={() => handleRemoveDomain(domain)}
                          className="text-neutral-400 hover:text-neutral-600"
                        >
                          <X className="size-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                <p className="text-xs text-neutral-500">
                  Restrict URLs to specific domains. Partners can submit URLs
                  from these domains or their subdomains.
                </p>
              </div>
            </div>
          )}
        </div>
      )}

      <div className="rounded-lg border border-neutral-200 bg-neutral-50/50 p-2.5 shadow-sm">
        <div className="flex items-center gap-2.5">
          <RewardIconSquare icon={ImageIcon} />
          <span className="text-content-default text-sm leading-relaxed">
            On approval, pay a{" "}
            <InlineBadgePopover
              text={rewardType === "flat" ? "flat rate" : "custom amount"}
              buttonClassName="!bg-blue-50 !text-blue-700 hover:!bg-blue-100"
            >
              <InlineBadgePopoverMenu
                items={REWARD_TYPES.map(({ value, label }) => ({
                  value,
                  text: label,
                }))}
                selectedValue={rewardType}
                onSelect={(v) => setValue("rewardType", v)}
              />
            </InlineBadgePopover>{" "}
            {rewardType === "flat" ? "of " : "shown as "}
            {rewardType === "flat" ? (
              <InlineBadgePopover
                text={
                  rewardAmount != null && !isNaN(rewardAmount)
                    ? currencyFormatter(rewardAmount * 100, {
                        trailingZeroDisplay: "stripIfInteger",
                      })
                    : "amount"
                }
                invalid={
                  rewardAmount == null ||
                  isNaN(rewardAmount) ||
                  rewardAmount < 0
                }
                buttonClassName={
                  rewardAmount != null &&
                  !isNaN(rewardAmount) &&
                  rewardAmount >= 0
                    ? "!bg-blue-50 !text-blue-700 hover:!bg-blue-100"
                    : "!bg-orange-50 !text-orange-500 hover:!bg-orange-100"
                }
              >
                <BountyAmountInput name="rewardAmount" />
              </InlineBadgePopover>
            ) : (
              <InlineBadgePopover
                text={rewardDescription || "reward description"}
                invalid={!rewardDescription?.trim()}
                buttonClassName={
                  rewardDescription?.trim()
                    ? "!bg-blue-50 !text-blue-700 hover:!bg-blue-100"
                    : "!bg-orange-50 !text-orange-500 hover:!bg-orange-100"
                }
              >
                <Controller
                  control={control}
                  name="rewardDescription"
                  rules={{ maxLength: 100 }}
                  render={({ field }) => (
                    <InlineBadgePopoverInput
                      {...field}
                      value={field.value ?? ""}
                      onChange={(e) => {
                        const val = (e.target as HTMLInputElement).value;
                        field.onChange(val === "" ? null : val);
                      }}
                      placeholder="Earn an additional 10% if you hit your revenue goal"
                      maxLength={100}
                    />
                  )}
                />
              </InlineBadgePopover>
            )}
          </span>
        </div>
      </div>
    </>
  );
}
