"use client";

import {
  InlineBadgePopover,
  InlineBadgePopoverMenu,
} from "@/ui/shared/inline-badge-popover";
import { AnimatedSizeContainer, Button } from "@dub/ui";
import { CircleCheck, Users2, Xmark } from "@dub/ui/icons";
import { cn, COUNTRIES } from "@dub/utils";
import { AnimatePresence, motion } from "motion/react";
import { useMemo, useRef } from "react";

export type ConditionKey = "country" | "emailDomain";

export type EligibilityOperator = "is" | "is_not";

export type EligibilityCondition = {
  id: string;
  key: ConditionKey | null;
  operator: EligibilityOperator | null;
  value: string[] | null;
};

type ValueType = "country" | "emailDomain";

type ConditionConfig = {
  label: string;
  operators: EligibilityOperator[];
  valueType: ValueType;
};

const CONDITION_CONFIGS: Record<ConditionKey, ConditionConfig> = {
  country: {
    label: "country",
    operators: ["is", "is_not"],
    valueType: "country",
  },
  emailDomain: {
    label: "email domain",
    operators: ["is", "is_not"],
    valueType: "emailDomain",
  },
};

const OPERATOR_LABELS: Record<EligibilityOperator, string> = {
  is: "is",
  is_not: "is not",
};

const ALL_KEYS = Object.keys(CONDITION_CONFIGS) as ConditionKey[];

function oxfordJoin(items: string[]): string {
  if (items.length === 0) return "";
  if (items.length === 1) return items[0];
  if (items.length === 2) return `${items[0]} or ${items[1]}`;
  return `${items.slice(0, -1).join(", ")}, or ${items[items.length - 1]}`;
}

function formatValue(value: string[] | null): string {
  if (!value || value.length === 0 || value[0] === "") return "value";
  return oxfordJoin(value);
}

function isValueValid(value: string[] | null): boolean {
  return Array.isArray(value) && value.length > 0 && value[0] !== "";
}

function generateId(): string {
  return Math.random().toString(36).slice(2, 10);
}

const COUNTRY_ITEMS = Object.entries(COUNTRIES).map(([code, name]) => ({
  text: name,
  value: code,
  icon: (
    <img
      alt={`${code} flag`}
      src={`https://hatscripts.github.io/circle-flags/flags/${code.toLowerCase()}.svg`}
      className="size-3 shrink-0"
    />
  ),
}));

function CountryValueInput({
  value,
  onChange,
}: {
  value: string[];
  onChange: (v: string[]) => void;
}) {
  return (
    <InlineBadgePopoverMenu
      search
      selectedValue={value}
      items={COUNTRY_ITEMS}
      onSelect={(code) =>
        onChange(
          value.includes(code)
            ? value.filter((v) => v !== code)
            : [...value, code],
        )
      }
    />
  );
}

function EmailDomainInput({
  value,
  onChange,
}: {
  value: string[];
  onChange: (v: string[]) => void;
}) {
  const domains = value.length > 0 ? value : [""];
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  const handleChange = (index: number, newVal: string) => {
    const next = [...domains];
    next[index] = newVal;
    onChange(next);
  };

  const handleRemove = (index: number) => {
    const next = domains.filter((_, i) => i !== index);
    onChange(next.length > 0 ? next : [""]);
    const focusIndex = Math.max(0, index - 1);
    requestAnimationFrame(() => inputRefs.current[focusIndex]?.focus());
  };

  const handleAdd = () => {
    onChange([...domains, ""]);
  };

  const showRemove = domains.length > 1;

  return (
    <div className="flex w-52 flex-col gap-1">
      {domains.map((domain, index) => (
        <div key={index} className="relative flex items-center">
          <input
            ref={(el) => {
              inputRefs.current[index] = el;
            }}
            type="text"
            value={domain}
            placeholder="@domain.com"
            autoFocus={index === domains.length - 1 && index > 0}
            className={cn(
              "block w-full rounded-md border border-neutral-300 py-1.5 text-sm text-neutral-900 placeholder-neutral-400",
              "focus:border-neutral-500 focus:outline-none focus:ring-1 focus:ring-neutral-500",
              showRemove ? "pl-2.5 pr-8" : "px-2.5",
            )}
            onChange={(e) => handleChange(index, e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                if (domain.trim()) handleAdd();
              }
              if (e.key === "Backspace" && !domain && showRemove) {
                e.preventDefault();
                handleRemove(index);
              }
            }}
          />
          {showRemove && (
            <button
              type="button"
              onClick={() => handleRemove(index)}
              className="absolute right-1 flex h-6 w-6 items-center justify-center rounded-md bg-neutral-100 text-neutral-900 hover:bg-neutral-200"
              aria-label="Remove domain"
            >
              <Xmark className="size-3" />
            </button>
          )}
        </div>
      ))}
      <Button
        type="button"
        variant="secondary"
        text="Add domain"
        className="h-6 text-xs font-medium text-neutral-900"
        onClick={handleAdd}
      />
    </div>
  );
}

function ValueBadge({
  conditionKey,
  value,
  onChange,
}: {
  conditionKey: ConditionKey;
  value: string[] | null;
  onChange: (v: string[]) => void;
}) {
  const config = CONDITION_CONFIGS[conditionKey];
  const displayText = isValueValid(value) ? formatValue(value) : "value";
  const isInvalid = !isValueValid(value);

  return (
    <InlineBadgePopover text={displayText} invalid={isInvalid}>
      {config.valueType === "country" && (
        <div className="p-1">
          <CountryValueInput value={value ?? []} onChange={onChange} />
        </div>
      )}
      {config.valueType === "emailDomain" && (
        <div className="p-1">
          <EmailDomainInput value={value ?? []} onChange={onChange} />
        </div>
      )}
    </InlineBadgePopover>
  );
}

function ConditionRow({
  condition,
  usedKeys,
  onChange,
  onRemove,
}: {
  condition: EligibilityCondition;
  usedKeys: Set<ConditionKey>;
  onChange: (updated: EligibilityCondition) => void;
  onRemove: () => void;
}) {
  const availableKeys = ALL_KEYS.filter(
    (k) => !usedKeys.has(k) || k === condition.key,
  );

  const handleKeyChange = (key: ConditionKey) => {
    onChange({ ...condition, key, operator: null, value: null });
  };

  const handleOperatorChange = (operator: EligibilityOperator) => {
    onChange({ ...condition, operator, value: null });
  };

  const handleValueChange = (value: string[]) => {
    onChange({ ...condition, value });
  };

  const keyConfig = condition.key ? CONDITION_CONFIGS[condition.key] : null;

  return (
    <div className="flex items-start gap-2 rounded-xl border border-neutral-200 bg-white p-2.5 shadow-sm">
      <div className="flex size-7 shrink-0 items-center justify-center rounded-md bg-neutral-100">
        <Users2 className="size-4 text-neutral-800" />
      </div>

      <span className="flex min-w-0 flex-1 flex-wrap items-center gap-x-1 gap-y-1 text-sm font-medium leading-relaxed text-neutral-800">
        If partner
        <InlineBadgePopover
          text={condition.key ? keyConfig!.label : "select item"}
          invalid={!condition.key}
        >
          <InlineBadgePopoverMenu
            selectedValue={condition.key ?? undefined}
            onSelect={(key) => handleKeyChange(key as ConditionKey)}
            items={availableKeys.map((k) => ({
              text: CONDITION_CONFIGS[k].label,
              value: k,
            }))}
          />
        </InlineBadgePopover>
        {condition.key && (
          <InlineBadgePopover
            text={
              condition.operator
                ? OPERATOR_LABELS[condition.operator]
                : "operator"
            }
            invalid={!condition.operator}
          >
            <InlineBadgePopoverMenu
              selectedValue={condition.operator ?? undefined}
              onSelect={(op) => handleOperatorChange(op as EligibilityOperator)}
              items={keyConfig!.operators.map((op) => ({
                text: OPERATOR_LABELS[op],
                value: op,
              }))}
            />
          </InlineBadgePopover>
        )}
        {condition.key && condition.operator && (
          <ValueBadge
            conditionKey={condition.key}
            value={condition.value}
            onChange={handleValueChange}
          />
        )}
      </span>

      <button
        type="button"
        onClick={onRemove}
        className="shrink-0 rounded-md p-2 text-neutral-900 transition-colors hover:bg-neutral-100"
        aria-label="Remove condition"
      >
        <Xmark className="size-3" />
      </button>
    </div>
  );
}

const MAX_CONDITIONS = ALL_KEYS.length;

export function EligibilityRequirements({
  value: conditions,
  onChange,
}: {
  value: EligibilityCondition[];
  onChange: (conditions: EligibilityCondition[]) => void;
}) {
  const usedKeys = useMemo(
    () =>
      new Set(conditions.map((c) => c.key).filter(Boolean) as ConditionKey[]),
    [conditions],
  );

  const allUsed = usedKeys.size >= MAX_CONDITIONS;

  const handleAdd = () => {
    if (allUsed) return;
    onChange([
      ...conditions,
      { id: generateId(), key: null, operator: null, value: null },
    ]);
  };

  const handleChange = (index: number, updated: EligibilityCondition) => {
    const next = [...conditions];
    next[index] = updated;
    onChange(next);
  };

  const handleRemove = (index: number) => {
    onChange(conditions.filter((_, i) => i !== index));
  };

  const isEmpty = conditions.length === 0;

  const allConditionsComplete = conditions.every(
    (c) => c.key && c.operator && isValueValid(c.value),
  );

  return (
    <AnimatedSizeContainer
      height
      transition={{ ease: "easeInOut", duration: 0.2 }}
      className="rounded-xl"
    >
      <div className="flex flex-col rounded-[10px] border border-neutral-200 bg-neutral-100 px-2.5 py-3">
        <AnimatePresence mode="wait" initial={false}>
          {isEmpty ? (
            <motion.button
              key="empty"
              type="button"
              onClick={handleAdd}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.15, ease: "easeInOut" }}
              className="flex w-full items-center justify-center gap-2 rounded-lg border border-neutral-200 bg-white px-2 py-2 text-sm font-medium text-neutral-900 transition-colors hover:bg-neutral-50"
            >
              <Users2 className="size-4" />
              Add condition
            </motion.button>
          ) : (
            <motion.div
              key="active"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.15, ease: "easeInOut" }}
            >
              <div className="flex flex-col">
                <AnimatePresence initial={false}>
                  {conditions.map((condition, index) => (
                    <motion.div
                      key={condition.id}
                      initial={{ opacity: 0, y: -6 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -6 }}
                      transition={{ duration: 0.15, ease: "easeOut" }}
                    >
                      <ConditionRow
                        condition={condition}
                        usedKeys={usedKeys}
                        onChange={(updated) => handleChange(index, updated)}
                        onRemove={() => handleRemove(index)}
                      />
                      {index < conditions.length - 1 && (
                        <div className="ml-6 h-2 w-px bg-neutral-300" />
                      )}
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>

              <div className="relative">
                <div className="ml-6 h-3 w-px bg-neutral-300" />

                <div className="flex items-center gap-2">
                  <span className="h-7 rounded-lg bg-neutral-300 px-2.5 py-1 text-sm font-semibold text-neutral-900">
                    AND
                  </span>

                  <div className="ml-auto">
                    {!allUsed && (
                      <Button
                        type="button"
                        variant="secondary"
                        text="Add condition"
                        className="h-7 rounded-lg px-2.5 text-sm"
                        onClick={handleAdd}
                        disabledTooltip={
                          !allConditionsComplete
                            ? "Complete the current condition first"
                            : undefined
                        }
                      />
                    )}
                  </div>
                </div>

                <div className="ml-6 h-3 w-px bg-neutral-300" />
              </div>

              <div className="flex items-center gap-2.5 rounded-xl border border-neutral-200 bg-white p-2.5 shadow-sm">
                <div className="flex size-7 shrink-0 items-center justify-center rounded-md bg-neutral-100">
                  <CircleCheck className="size-4 text-neutral-600" />
                </div>
                <span className="text-sm font-medium text-neutral-700">
                  Allow partner to apply
                </span>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </AnimatedSizeContainer>
  );
}
