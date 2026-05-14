"use client";

import { constructRewardAmount } from "@/lib/api/sales/construct-reward-amount";
import { handleMoneyInputChange, handleMoneyKeyDown } from "@/lib/form-utils";
import {
  PARTNER_REFERRAL_FLAT_TRIGGERS,
  PARTNER_REFERRAL_PERCENTAGE_BASIS_LABELS,
  PARTNER_REFERRAL_PERCENTAGE_TRIGGERS,
  PARTNER_REFERRAL_TRIGGER,
  PARTNER_REFERRAL_TRIGGER_LABELS,
} from "@/lib/partner-referrals/constants";
import { RECURRING_MAX_DURATIONS } from "@/lib/zod/schemas/misc";
import { RewardStructure } from "@dub/prisma/client";
import { capitalize, cn, currencyFormatter, pluralize } from "@dub/utils";
import { useContext, useEffect, useMemo } from "react";
import {
  InlineBadgePopover,
  InlineBadgePopoverContext,
  InlineBadgePopoverMenu,
} from "../../shared/inline-badge-popover";
import { useAddEditRewardForm } from "./add-edit-reward-sheet";

type Trigger = (typeof PARTNER_REFERRAL_TRIGGER)[number];

const PERCENTAGE_TRIGGER_ITEMS = PARTNER_REFERRAL_PERCENTAGE_TRIGGERS.map(
  (trigger) => ({
    text: PARTNER_REFERRAL_PERCENTAGE_BASIS_LABELS[trigger],
    value: trigger,
  }),
);

const FLAT_TRIGGER_ITEMS = PARTNER_REFERRAL_FLAT_TRIGGERS.map((trigger) => ({
  text: PARTNER_REFERRAL_TRIGGER_LABELS[trigger],
  value: trigger,
}));

const MAX_DURATION_MENU_ITEMS = [
  {
    text: "one time",
    value: "0",
  },
  ...RECURRING_MAX_DURATIONS.filter((v) => v !== 0 && v !== 1).map((v) => ({
    text: `for ${v} ${pluralize("month", Number(v))}`,
    value: v.toString(),
  })),
  {
    text: "for the customer's lifetime",
    value: "Infinity",
  },
];

export function PartnerReferralRewardBuilder() {
  const { watch, setValue } = useAddEditRewardForm();

  const [type, amountInCents, amountInPercentage, config, maxDuration] = watch([
    "type",
    "amountInCents",
    "amountInPercentage",
    "config",
    "maxDuration",
  ]);

  const amount = type === "flat" ? amountInCents : amountInPercentage;

  const thresholdDollars =
    config?.trigger === "commissionThreshold"
      ? config.commissionsThresholdInCents
      : undefined;

  // Keep config in sync with the main reward type. If the trigger doesn't
  // match the current reward type, reset to that type's default trigger.
  useEffect(() => {
    const validTriggers =
      type === "percentage"
        ? PARTNER_REFERRAL_PERCENTAGE_TRIGGERS
        : PARTNER_REFERRAL_FLAT_TRIGGERS;

    if (
      config?.trigger &&
      (validTriggers as readonly Trigger[]).includes(config?.trigger)
    ) {
      return;
    }

    const nextTrigger: Trigger =
      type === "percentage" ? "saleRecorded" : "partnerApproved";

    setValue("config", { trigger: nextTrigger }, { shouldDirty: true });
  }, [setValue, config?.trigger, type]);

  // Flat triggers (partnerApproved, commissionThreshold) don't support
  // maxDuration, so clear it whenever a flat trigger is active. When switching
  // back to a percentage trigger, restore maxDuration if it was cleared.
  useEffect(() => {
    if (
      config?.trigger &&
      (PARTNER_REFERRAL_FLAT_TRIGGERS as readonly Trigger[]).includes(
        config.trigger,
      ) &&
      maxDuration !== null
    ) {
      setValue("maxDuration", null, { shouldDirty: true });
      return;
    }

    if (
      config?.trigger &&
      (PARTNER_REFERRAL_PERCENTAGE_TRIGGERS as readonly Trigger[]).includes(
        config.trigger,
      ) &&
      maxDuration === null
    ) {
      setValue("maxDuration", Infinity, { shouldDirty: true });
    }
  }, [setValue, config?.trigger, maxDuration]);

  const amountText = useMemo(() => {
    if (amount == null || Number.isNaN(Number(amount))) return "amount";

    return constructRewardAmount({
      type,
      maxDuration: null,
      amountInCents: type === "flat" ? Number(amount) * 100 : undefined,
      amountInPercentage: type === "percentage" ? Number(amount) : undefined,
    });
  }, [amount, type]);

  const triggerText = useMemo(() => {
    if (!config?.trigger) return "event";

    if (type === "percentage") {
      if (
        config.trigger === "commissionEarned" ||
        config.trigger === "saleRecorded"
      ) {
        return PARTNER_REFERRAL_PERCENTAGE_BASIS_LABELS[config.trigger];
      }

      return PARTNER_REFERRAL_PERCENTAGE_BASIS_LABELS.saleRecorded;
    }

    return PARTNER_REFERRAL_TRIGGER_LABELS[config.trigger];
  }, [type, config?.trigger]);

  const thresholdText =
    thresholdDollars != null && !Number.isNaN(Number(thresholdDollars))
      ? currencyFormatter(Math.round(Number(thresholdDollars) * 100), {
          trailingZeroDisplay: "stripIfInteger",
        })
      : "$1";

  const maxDurationText = useMemo(() => {
    if (maxDuration === 0) return "one time";
    if (maxDuration === Infinity) return "for the customer's lifetime";
    return `for ${maxDuration} ${pluralize("month", Number(maxDuration))}`;
  }, [maxDuration]);

  return (
    <span className="leading-relaxed">
      Pay a{" "}
      <InlineBadgePopover text={capitalize(type)}>
        <InlineBadgePopoverMenu
          selectedValue={type}
          onSelect={(value) =>
            setValue("type", value as RewardStructure, { shouldDirty: true })
          }
          items={[
            { text: "Percentage", value: "percentage" },
            { text: "Flat fee", value: "flat" },
          ]}
        />
      </InlineBadgePopover>{" "}
      of{" "}
      <InlineBadgePopover
        text={amountText}
        invalid={amount == null || Number.isNaN(Number(amount))}
      >
        <RewardAmountInput />
      </InlineBadgePopover>{" "}
      {type === "percentage" ? (
        <>
          based on the{" "}
          <InlineBadgePopover text={triggerText} invalid={!config?.trigger}>
            <InlineBadgePopoverMenu
              selectedValue={config?.trigger}
              onSelect={(value) => {
                setValue(
                  "config",
                  { trigger: value as Trigger },
                  { shouldDirty: true },
                );
              }}
              items={PERCENTAGE_TRIGGER_ITEMS}
            />
          </InlineBadgePopover>{" "}
          <InlineBadgePopover text={maxDurationText}>
            <InlineBadgePopoverMenu
              selectedValue={maxDuration?.toString()}
              onSelect={(value) =>
                setValue("maxDuration", Number(value), {
                  shouldDirty: true,
                })
              }
              items={MAX_DURATION_MENU_ITEMS}
            />
          </InlineBadgePopover>
        </>
      ) : (
        <>
          when referred partner{" "}
          <InlineBadgePopover text={triggerText} invalid={!config?.trigger}>
            <InlineBadgePopoverMenu
              selectedValue={config?.trigger}
              onSelect={(value) => {
                if (value === "commissionThreshold") {
                  setValue(
                    "config",
                    { trigger: value, commissionsThresholdInCents: 1 },
                    { shouldDirty: true },
                  );
                  return;
                }

                setValue(
                  "config",
                  { trigger: value as Trigger },
                  { shouldDirty: true },
                );
              }}
              items={FLAT_TRIGGER_ITEMS}
            />
          </InlineBadgePopover>
          {config?.trigger === "commissionThreshold" && (
            <>
              {" "}
              <InlineBadgePopover text={thresholdText}>
                <ThresholdInput />
              </InlineBadgePopover>
            </>
          )}
        </>
      )}
    </span>
  );
}

function RewardAmountInput() {
  const { watch, register } = useAddEditRewardForm();
  const { setIsOpen } = useContext(InlineBadgePopoverContext);

  const type = watch("type");
  const fieldName = type === "flat" ? "amountInCents" : "amountInPercentage";

  return (
    <div className="relative rounded-md shadow-sm">
      {type === "flat" && (
        <span className="absolute inset-y-0 left-0 flex items-center pl-1.5 text-sm text-neutral-400">
          $
        </span>
      )}
      <input
        className={cn(
          "block w-full rounded-md border-neutral-300 px-1.5 py-1 text-neutral-900 placeholder-neutral-400 focus:border-neutral-500 focus:outline-none focus:ring-neutral-500 sm:w-32 sm:text-sm",
          type === "flat" ? "pl-4 pr-12" : "pr-7",
        )}
        {...register(fieldName, {
          required: true,
          setValueAs: (value: string) => (value === "" ? undefined : +value),
          min: 0,
          max: type === "percentage" ? 100 : undefined,
          onChange: handleMoneyInputChange,
        })}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            setIsOpen(false);
            return;
          }

          handleMoneyKeyDown(e);
        }}
      />
      <span className="absolute inset-y-0 right-0 flex items-center pr-1.5 text-sm text-neutral-400">
        {type === "flat" ? "USD" : "%"}
      </span>
    </div>
  );
}

function ThresholdInput() {
  const { register, setValue, watch } = useAddEditRewardForm();
  const { setIsOpen } = useContext(InlineBadgePopoverContext);

  const config = watch("config");
  const thresholdDollars =
    config?.trigger === "commissionThreshold"
      ? config.commissionsThresholdInCents
      : undefined;

  return (
    <div className="flex flex-col gap-1">
      <div className="relative rounded-md shadow-sm">
        <span className="absolute inset-y-0 left-0 flex items-center pl-1.5 text-sm text-neutral-400">
          $
        </span>
        <input
          className="block w-full rounded-md border-neutral-300 px-1.5 py-1 pl-4 pr-12 text-neutral-900 placeholder-neutral-400 focus:border-neutral-500 focus:outline-none focus:ring-neutral-500 sm:w-32 sm:text-sm"
          placeholder="1"
          defaultValue={thresholdDollars}
          {...register("config.commissionsThresholdInCents" as any, {
            required: true,
            setValueAs: (v: string) => (v === "" ? undefined : +v),
            min: 1,
            onChange: handleMoneyInputChange,
          })}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              setIsOpen(false);
              return;
            }
            handleMoneyKeyDown(e);
          }}
          onBlur={(e) => {
            const next = Number((e.target as HTMLInputElement).value);
            if (!Number.isNaN(next) && next >= 1) {
              setValue("config.commissionsThresholdInCents" as any, next, {
                shouldDirty: true,
              });
            }
          }}
        />
        <span className="absolute inset-y-0 right-0 flex items-center pr-1.5 text-sm text-neutral-400">
          USD
        </span>
      </div>
      <p className="text-xs text-neutral-500">Minimum $1</p>
    </div>
  );
}
