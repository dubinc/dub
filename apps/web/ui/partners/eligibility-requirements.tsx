"use client";

import { EligibilityConditionDB } from "@/lib/types";
import {
  InlineBadgePopover,
  InlineBadgePopoverMenu,
} from "@/ui/shared/inline-badge-popover";
import { AnimatedSizeContainer } from "@dub/ui";
import { CircleCheck, Users2, Xmark } from "@dub/ui/icons";
import { COUNTRIES } from "@dub/utils";

type ConditionKey = EligibilityConditionDB["key"];

type EligibilityOperator = EligibilityConditionDB["operator"];

export type EligibilityCondition = {
  id: string;
  key: EligibilityConditionDB["key"] | null;
  operator: EligibilityConditionDB["operator"] | null;
  value: EligibilityConditionDB["value"] | null;
};

const CONDITION_CONFIGS: Record<
  ConditionKey,
  {
    label: string;
    operators: EligibilityOperator[];
  }
> = {
  country: {
    label: "country",
    operators: ["is", "is_not"],
  },
  emailDomain: {
    label: "email domain",
    operators: ["is", "is_not"],
  },
  identityVerification: {
    label: "identity verification",
    operators: ["is"],
  },
};

const OPERATOR_LABELS: Record<EligibilityOperator, string> = {
  is: "is",
  is_not: "is not",
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

function ValueBadge({
  value,
  onChange,
}: {
  conditionKey: ConditionKey;
  value: string[] | null;
  onChange: (v: string[]) => void;
}) {
  const displayText = isValueValid(value) ? value!.join(", ") : "value";
  const isInvalid = !isValueValid(value);

  return (
    <InlineBadgePopover text={displayText} invalid={isInvalid}>
      <div className="p-1">
        <CountryValueInput value={value ?? []} onChange={onChange} />
      </div>
      {/* emailDomain branch commented out — preserved for future use */}
      {/* {config.valueType === "emailDomain" && (
        <div className="p-1">
          <EmailDomainInput value={value ?? []} onChange={onChange} />
        </div>
      )} */}
    </InlineBadgePopover>
  );
}

function ConditionRow({
  condition,
  onChange,
  onRemove,
}: {
  condition: EligibilityCondition;
  onChange: (updated: EligibilityCondition) => void;
  onRemove: () => void;
}) {
  const selectedKey = condition.key;
  const isIdentityCondition = selectedKey === "identityVerification";
  const keyConfig = selectedKey ? CONDITION_CONFIGS[selectedKey] : null;

  const handleOperatorChange = (operator: EligibilityOperator) => {
    onChange({ ...condition, operator, value: null });
  };

  const handleKeyChange = (key: ConditionKey) => {
    if (key === "identityVerification") {
      onChange({
        ...condition,
        key,
        operator: "is",
        value: ["required"],
      });
      return;
    }

    onChange({
      ...condition,
      key,
      operator: null,
      value: null,
    });
  };

  const handleValueChange = (value: string[]) => {
    onChange({ ...condition, value });
  };

  return (
    <div className="flex items-start gap-2 rounded-xl border border-neutral-200 bg-white p-2.5 shadow-sm">
      <div className="flex size-7 shrink-0 items-center justify-center rounded-md bg-neutral-100">
        {isIdentityCondition ? (
          <CircleCheck className="size-4 text-neutral-800" />
        ) : (
          <Users2 className="size-4 text-neutral-800" />
        )}
      </div>

      <span className="flex min-w-0 flex-1 flex-wrap items-center gap-x-1 gap-y-1 text-sm font-medium leading-relaxed text-neutral-800">
        If partner
        <InlineBadgePopover text={keyConfig?.label ?? "attribute"} invalid={!selectedKey}>
          <InlineBadgePopoverMenu
            selectedValue={selectedKey ?? undefined}
            onSelect={(key) => handleKeyChange(key as ConditionKey)}
            items={[
              { text: CONDITION_CONFIGS.country.label, value: "country" },
              {
                text: CONDITION_CONFIGS.identityVerification.label,
                value: "identityVerification",
              },
            ]}
          />
        </InlineBadgePopover>
        {isIdentityCondition ? (
          <>is verified</>
        ) : (
          <>
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
                items={CONDITION_CONFIGS.country.operators.map((op) => ({
                  text: OPERATOR_LABELS[op],
                  value: op,
                }))}
              />
            </InlineBadgePopover>
            {condition.operator && (
              <ValueBadge
                conditionKey="country"
                value={condition.value}
                onChange={handleValueChange}
              />
            )}
          </>
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
  const hasCondition = conditions.length > 0;

  const handleAdd = () => {
    if (hasCondition) return;
    onChange([{ id: generateId(), key: null, operator: null, value: null }]);
  };

  const handleChange = (updated: EligibilityCondition) => {
    onChange([updated]);
  };

  const handleRemove = () => {
    onChange([]);
  };

  return (
    <AnimatedSizeContainer
      height
      className="rounded-[10px] border border-neutral-200 bg-neutral-100"
    >
      <div className="flex flex-col px-2.5 py-3">
        {!hasCondition ? (
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
            <div className="flex flex-col">
              <ConditionRow
                condition={conditions[0]}
                onChange={handleChange}
                onRemove={handleRemove}
              />
            </div>

            <div className="ml-6 h-3 w-px bg-neutral-300" />

            <div className="flex items-center gap-2.5 rounded-xl border border-neutral-200 bg-white p-2.5 shadow-sm">
              <div className="flex size-7 shrink-0 items-center justify-center rounded-md bg-neutral-100">
                <CircleCheck className="size-4 text-neutral-600" />
              </div>
              <span className="text-sm font-medium text-neutral-700">
                Allow partner to apply
              </span>
            </div>
          </div>
        )}
      </div>
    </AnimatedSizeContainer>
  );
}
