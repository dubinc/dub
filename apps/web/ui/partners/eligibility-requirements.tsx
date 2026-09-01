"use client";

import { EligibilityConditionDB } from "@/lib/types";
import {
  ELIGIBILITY_ACCOUNT_ATTRIBUTES,
  ELIGIBILITY_PROFILE_ATTRIBUTES,
} from "@/lib/zod/schemas/programs";
import { CountryFlag } from "@/ui/shared/country-flag";
import {
  InlineBadgePopover,
  InlineBadgePopoverMenu,
} from "@/ui/shared/inline-badge-popover";
import { AnimatedSizeContainer, Button, Icon } from "@dub/ui";
import { ArrowTurnRight2, CircleCheck, Users2, Xmark } from "@dub/ui/icons";
import { cn, COUNTRIES } from "@dub/utils";
import { Fragment } from "react";
import {
  ELIGIBILITY_ACCOUNT_ATTRIBUTE_META,
  ELIGIBILITY_PROFILE_ATTRIBUTE_META,
} from "./eligibility-attributes";

type ConditionKey = EligibilityConditionDB["key"];

type EligibilityOperator = EligibilityConditionDB["operator"];

export type EligibilityCondition = {
  id: string;
  key: ConditionKey | null;
  operator: EligibilityOperator | null;
  value: EligibilityConditionDB["value"] | null;
};

// Condition types offered in the UI (legacy emailDomain conditions are not)
export const ELIGIBILITY_CONDITION_KEYS = [
  "country",
  "profile",
  "account",
] as const satisfies readonly ConditionKey[];

const CONDITION_KEY_LABELS: Record<ConditionKey, string> = {
  country: "country",
  profile: "profile",
  account: "account",
  emailDomain: "email domain", // legacy — not offered in the UI
};

const COUNTRY_OPERATORS = ["is", "is_not"] as const;

const OPERATOR_LABELS: Record<string, string> = {
  is: "is",
  is_not: "is not",
};

// operator/value defaults applied when a condition's key is selected
const KEY_DEFAULTS: Record<
  (typeof ELIGIBILITY_CONDITION_KEYS)[number],
  { operator: EligibilityOperator | null }
> = {
  country: { operator: null },
  profile: { operator: "has" },
  account: { operator: "is" },
};

function isValueValid(value: string[] | null): boolean {
  return Array.isArray(value) && value.length > 0 && value[0] !== "";
}

export function generateId(): string {
  return Math.random().toString(36).slice(2, 10);
}

const COUNTRY_ITEMS = Object.entries(COUNTRIES).map(([code, name]) => ({
  text: name,
  value: code,
  icon: <CountryFlag countryCode={code} className="size-3" />,
}));

// Fixed-width slot so the text column aligns across items regardless of
// each icon's optical size
function AttributeIcon({
  icon: Icon,
  iconClassName,
}: {
  icon: Icon;
  iconClassName?: string;
}) {
  return (
    <span className="mt-0.5 flex w-4 shrink-0 items-center justify-center">
      <Icon className={cn("text-neutral-600", iconClassName ?? "size-3.5")} />
    </span>
  );
}

const PROFILE_ITEMS = ELIGIBILITY_PROFILE_ATTRIBUTES.map((attribute) => {
  const meta = ELIGIBILITY_PROFILE_ATTRIBUTE_META[attribute];
  return {
    text: meta.label,
    value: attribute,
    icon: <AttributeIcon {...meta} />,
  };
});

const ACCOUNT_ITEMS = ELIGIBILITY_ACCOUNT_ATTRIBUTES.map((attribute) => {
  const meta = ELIGIBILITY_ACCOUNT_ATTRIBUTE_META[attribute];
  return {
    text: meta.label,
    value: attribute,
    icon: <AttributeIcon {...meta} />,
  };
});

function toggleValue(value: string[] | null, selected: string): string[] {
  const current = value ?? [];
  return current.includes(selected)
    ? current.filter((v) => v !== selected)
    : [...current, selected];
}

function MultiValueBadge({
  value,
  items,
  labels,
  onChange,
}: {
  value: string[] | null;
  items: { text: string; value: string; icon?: React.ReactNode }[];
  labels: Record<string, { label: string }>;
  onChange: (v: string[]) => void;
}) {
  const selected = value ?? [];

  const displayText =
    selected.length === 0
      ? "value"
      : selected.length === 1
        ? labels[selected[0]]?.label ?? selected[0]
        : `${selected.length} selected`;

  return (
    <InlineBadgePopover text={displayText} invalid={selected.length === 0}>
      <InlineBadgePopoverMenu
        alignTop
        sortSelectedFirst={false}
        selectedValue={selected}
        items={items}
        onSelect={(attribute) => onChange(toggleValue(value, attribute))}
      />
    </InlineBadgePopover>
  );
}

function CountryValueBadge({
  value,
  onChange,
}: {
  value: string[] | null;
  onChange: (v: string[]) => void;
}) {
  const displayText = isValueValid(value) ? value!.join(", ") : "value";

  return (
    <InlineBadgePopover text={displayText} invalid={!isValueValid(value)}>
      <div className="p-1">
        <InlineBadgePopoverMenu
          search
          selectedValue={value ?? []}
          items={COUNTRY_ITEMS}
          onSelect={(code) => onChange(toggleValue(value, code))}
        />
      </div>
    </InlineBadgePopover>
  );
}

// EmailDomainInput — commented out, preserved for future use
// function EmailDomainInput({
//   value,
//   onChange,
// }: {
//   value: string[];
//   onChange: (v: string[]) => void;
// }) {
//   const domains = value.length > 0 ? value : [""];
//   const inputRefs = useRef<(HTMLInputElement | null)[]>([]);
//
//   const handleChange = (index: number, newVal: string) => {
//     const next = [...domains];
//     next[index] = newVal;
//     onChange(next);
//   };
//
//   const handleRemove = (index: number) => {
//     const next = domains.filter((_, i) => i !== index);
//     onChange(next.length > 0 ? next : [""]);
//     const focusIndex = Math.max(0, index - 1);
//     requestAnimationFrame(() => inputRefs.current[focusIndex]?.focus());
//   };
//
//   const handleAdd = () => {
//     onChange([...domains, ""]);
//   };
//
//   const showRemove = domains.length > 1;
//
//   const hasInvalidEntry = domains.some(
//     (d) => d.trim().length > 0 && !isValidDomainPattern(d),
//   );
//
//   return (
//     <div className="flex w-52 flex-col gap-1">
//       {domains.map((domain, index) => {
//         const isInvalid =
//           domain.trim().length > 0 && !isValidDomainPattern(domain);
//         return (
//           <div key={index} className="flex flex-col gap-0.5">
//             <div className="relative flex items-center">
//               <input
//                 ref={(el) => { inputRefs.current[index] = el; }}
//                 type="text"
//                 value={domain}
//                 placeholder="@domain.com"
//                 autoFocus={index === domains.length - 1 && index > 0}
//                 className={cn(
//                   "block h-8 w-full rounded-lg border py-1.5 text-sm text-neutral-800 placeholder-neutral-400",
//                   "focus:outline-none focus:ring-1",
//                   isInvalid
//                     ? "border-red-400 focus:border-red-500 focus:ring-red-500"
//                     : "border-neutral-300 focus:border-neutral-500 focus:ring-neutral-500",
//                   showRemove ? "pl-2.5 pr-8" : "px-2.5",
//                 )}
//                 onChange={(e) => handleChange(index, e.target.value)}
//                 onKeyDown={(e) => {
//                   if (e.key === "Enter") {
//                     e.preventDefault();
//                     if (domain.trim() && !hasInvalidEntry) handleAdd();
//                   }
//                   if (e.key === "Backspace" && !domain && showRemove) {
//                     e.preventDefault();
//                     handleRemove(index);
//                   }
//                 }}
//               />
//               {showRemove && (
//                 <button
//                   type="button"
//                   onClick={() => handleRemove(index)}
//                   className="absolute right-1 flex h-6 w-6 items-center justify-center rounded-md bg-neutral-100 text-neutral-900 hover:bg-neutral-200"
//                   aria-label="Remove domain"
//                 >
//                   <Xmark className="size-3" />
//                 </button>
//               )}
//             </div>
//             {isInvalid && (
//               <p className="text-xs text-red-500">
//                 Use format: @domain.com or @*.tld
//               </p>
//             )}
//           </div>
//         );
//       })}
//       <Button
//         type="button"
//         variant="secondary"
//         text="Add domain"
//         className="h-6 text-xs font-medium text-neutral-900"
//         onClick={handleAdd}
//         disabled={hasInvalidEntry}
//       />
//     </div>
//   );
// }

function ConditionRow({
  condition,
  availableKeys,
  isFirst,
  onChange,
  onRemove,
}: {
  condition: EligibilityCondition;
  availableKeys: (typeof ELIGIBILITY_CONDITION_KEYS)[number][];
  isFirst: boolean;
  onChange: (updated: EligibilityCondition) => void;
  onRemove: () => void;
}) {
  const handleKeyChange = (key: (typeof ELIGIBILITY_CONDITION_KEYS)[number]) =>
    onChange({
      ...condition,
      key,
      operator: KEY_DEFAULTS[key].operator,
      value: null,
    });

  const handleOperatorChange = (operator: EligibilityOperator) =>
    onChange({ ...condition, operator, value: null });

  const handleValueChange = (value: string[]) =>
    onChange({ ...condition, value });

  return (
    <div className="flex items-start gap-2 rounded-xl border border-neutral-200 bg-white p-2.5 shadow-sm">
      <div className="flex size-7 shrink-0 items-center justify-center rounded-md bg-neutral-100">
        {isFirst ? (
          <Users2 className="size-4 text-neutral-800" />
        ) : (
          <ArrowTurnRight2 className="size-4 text-neutral-600" />
        )}
      </div>

      <span className="flex min-w-0 flex-1 flex-wrap items-center gap-x-1 gap-y-1 text-sm font-medium leading-relaxed text-neutral-800">
        {isFirst ? "If partner" : "And if partner"}
        <InlineBadgePopover
          text={
            condition.key ? CONDITION_KEY_LABELS[condition.key] : "select item"
          }
          invalid={!condition.key}
        >
          <InlineBadgePopoverMenu
            selectedValue={condition.key ?? undefined}
            onSelect={(key) =>
              handleKeyChange(
                key as (typeof ELIGIBILITY_CONDITION_KEYS)[number],
              )
            }
            items={availableKeys.map((key) => ({
              text: CONDITION_KEY_LABELS[key],
              value: key,
            }))}
          />
        </InlineBadgePopover>

        {condition.key === "country" && (
          <>
            <InlineBadgePopover
              text={
                condition.operator
                  ? OPERATOR_LABELS[condition.operator]
                  : "condition"
              }
              invalid={!condition.operator}
            >
              <InlineBadgePopoverMenu
                selectedValue={condition.operator ?? undefined}
                onSelect={(op) =>
                  handleOperatorChange(op as EligibilityOperator)
                }
                items={COUNTRY_OPERATORS.map((op) => ({
                  text: OPERATOR_LABELS[op],
                  value: op,
                }))}
              />
            </InlineBadgePopover>
            {condition.operator && (
              <CountryValueBadge
                value={condition.value}
                onChange={handleValueChange}
              />
            )}
          </>
        )}

        {condition.key === "profile" && (
          <>
            has
            <MultiValueBadge
              value={condition.value}
              items={PROFILE_ITEMS}
              labels={ELIGIBILITY_PROFILE_ATTRIBUTE_META}
              onChange={handleValueChange}
            />
          </>
        )}

        {condition.key === "account" && (
          <MultiValueBadge
            value={condition.value}
            items={ACCOUNT_ITEMS}
            labels={ELIGIBILITY_ACCOUNT_ATTRIBUTE_META}
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

export function EligibilityRequirements({
  value: conditions,
  onChange,
}: {
  value: EligibilityCondition[];
  onChange: (conditions: EligibilityCondition[]) => void;
}) {
  const usedKeys = conditions.map((condition) => condition.key).filter(Boolean);

  const hasIncompleteCondition = conditions.some((condition) => !condition.key);

  const canAddCondition =
    !hasIncompleteCondition &&
    conditions.length < ELIGIBILITY_CONDITION_KEYS.length;

  const handleAdd = () => {
    onChange([
      ...conditions,
      { id: generateId(), key: null, operator: null, value: null },
    ]);
  };

  const handleChange = (updated: EligibilityCondition) => {
    onChange(
      conditions.map((condition) =>
        condition.id === updated.id ? updated : condition,
      ),
    );
  };

  const handleRemove = (id: string) => {
    onChange(conditions.filter((condition) => condition.id !== id));
  };

  return (
    <AnimatedSizeContainer
      height
      className="rounded-[10px] border border-neutral-200 bg-neutral-100"
    >
      <div className="flex flex-col px-2.5 py-3">
        {conditions.length === 0 ? (
          <button
            type="button"
            onClick={handleAdd}
            className="flex w-full items-center justify-center gap-2 rounded-lg border border-neutral-200 bg-white px-2 py-2 text-sm font-medium text-neutral-900 transition-colors hover:bg-neutral-50"
          >
            <Users2 className="size-4" />
            Add condition
          </button>
        ) : (
          <div>
            {conditions.map((condition, index) => (
              <Fragment key={condition.id}>
                <ConditionRow
                  condition={condition}
                  availableKeys={ELIGIBILITY_CONDITION_KEYS.filter(
                    (key) => key === condition.key || !usedKeys.includes(key),
                  )}
                  isFirst={index === 0}
                  onChange={handleChange}
                  onRemove={() => handleRemove(condition.id)}
                />

                <div className="ml-6 h-3 w-px bg-neutral-300" />
              </Fragment>
            ))}

            <div className="flex items-center gap-2.5 rounded-xl border border-neutral-200 bg-white p-2.5 shadow-sm">
              <div className="flex size-7 shrink-0 items-center justify-center rounded-md bg-neutral-100">
                <CircleCheck className="size-4 text-neutral-600" />
              </div>
              <span className="text-sm font-medium text-neutral-700">
                Allow partner to apply
              </span>
            </div>

            <Button
              type="button"
              text="Add rule"
              variant="secondary"
              className="mt-3 h-8 w-fit rounded-lg px-3"
              onClick={handleAdd}
              disabled={!canAddCondition}
              disabledTooltip={
                !canAddCondition
                  ? hasIncompleteCondition
                    ? "Select a condition before adding another rule"
                    : "All available rules have been added"
                  : undefined
              }
            />
          </div>
        )}
      </div>
    </AnimatedSizeContainer>
  );
}
