"use client";

import useGroup from "@/lib/swr/use-group";
import { WorkflowCondition } from "@/lib/types";
import { GroupColorCircle } from "@/ui/partners/groups/group-color-circle";
import {
  InlineBadgePopover,
  InlineBadgePopoverAmountInput,
  InlineBadgePopoverMenu,
} from "@/ui/shared/inline-badge-popover";
import { ArrowTurnRight2, Button, UserArrowRight, Users } from "@dub/ui";
import { currencyFormatter, nFormatter } from "@dub/utils";
import { X } from "lucide-react";
import Link from "next/link";
import { Fragment, useMemo, useState } from "react";
import { SettingsRow } from "./settings-row";

const ATTRIBUTES = [
  { value: "totalLeads", text: "total leads", type: "number" },
  { value: "totalConversions", text: "total conversions", type: "number" },
  { value: "totalSaleAmount", text: "total revenue", type: "currency" },
  { value: "totalCommissions", text: "total commissions", type: "currency" },
] as const;

type Attribute = (typeof ATTRIBUTES)[number];
type AttributeValue = (typeof ATTRIBUTES)[number]["value"];
type AttributeType = (typeof ATTRIBUTES)[number]["type"];

const ATTRIBUTE_BY_VALUE = Object.fromEntries(
  ATTRIBUTES.map(({ value, text, type }) => [value, { text, type }]),
) as Record<AttributeValue, { text: string; type: AttributeType }>;

// Format the value based on the attribute type
const formatValue = (
  value: number | undefined,
  type: AttributeType | undefined,
) => {
  if (!value) {
    return "value";
  }

  if (type === "currency") {
    return currencyFormatter(Number(value) * 100, {
      trailingZeroDisplay: "stripIfInteger",
    });
  }

  if (type === "number") {
    return nFormatter(value);
  }

  return value;
};

export function GroupMoveRule() {
  const [rules, setRules] = useState<WorkflowCondition[]>([]);

  const disableAddRuleButton = rules.length >= ATTRIBUTES.length;
  const usedAttributes = useMemo(
    () =>
      rules
        .map((r) => r.attribute)
        .filter((a): a is NonNullable<typeof a> => a != null),
    [rules],
  );

  const addRule = () => {
    setRules([
      ...rules,
      {
        attribute: undefined as any,
        operator: "gte",
        value: undefined as any,
      },
    ]);
  };

  return (
    <SettingsRow
      heading="Group move"
      description={
        <>
          Create rules to move partners to this group when they meet specific
          criteria.
          <Link
            href="https://dub.co/help"
            target="_blank"
            className="ml-1 underline"
          >
            Learn more
          </Link>
        </>
      }
    >
      {rules.length === 0 ? (
        <NoGroupRule />
      ) : (
        <div className="relative flex flex-col">
          {rules.map((rule, index) => {
            // Filter out attributes already used by other rules
            const availableAttributes = ATTRIBUTES.filter(
              (a) =>
                a.value === rule.attribute || !usedAttributes.includes(a.value),
            );

            return (
              <Fragment key={index}>
                <GroupRule
                  index={index}
                  rule={rule}
                  attributes={availableAttributes}
                  onUpdate={(updatedRule) => {
                    setRules((prev) =>
                      prev.map((r, i) =>
                        i === index ? { ...r, ...updatedRule } : r,
                      ),
                    );
                  }}
                  onRemove={() => {
                    setRules((prev) => prev.filter((_, i) => i !== index));
                  }}
                />

                <div className="ml-6 h-4 w-px bg-neutral-200" />
              </Fragment>
            );
          })}

          <GroupMoveTarget />
        </div>
      )}

      <Button
        text="Add rule"
        variant="primary"
        className="mt-4 h-8 w-fit rounded-lg px-3"
        onClick={addRule}
        disabled={disableAddRuleButton}
        disabledTooltip={
          disableAddRuleButton
            ? "All rules are in use. Delete existing rules."
            : undefined
        }
      />
    </SettingsRow>
  );
}

function GroupRule({
  rule,
  onUpdate,
  onRemove,
  index,
  attributes,
}: {
  rule: WorkflowCondition;
  onUpdate: (updates: Partial<WorkflowCondition>) => void;
  onRemove: () => void;
  index: number;
  attributes: Attribute[];
}) {
  const isFirst = index === 0;

  return (
    <div className="flex flex-col rounded-lg border border-neutral-200 bg-white">
      <div className="flex items-center justify-between p-2.5 pr-3">
        <div className="flex items-center gap-2">
          <div className="flex size-7 shrink-0 items-center justify-center rounded-md bg-neutral-100">
            {isFirst ? (
              <Users className="size-4 text-neutral-600" />
            ) : (
              <ArrowTurnRight2 className="size-4 text-neutral-600" />
            )}
          </div>
          <span className="text-sm font-medium text-neutral-800">
            {isFirst ? "If partner" : "And if partner"}
            {/* Select the attribute */}
            <InlineBadgePopover
              text={ATTRIBUTE_BY_VALUE[rule.attribute]?.text || "activity"}
              invalid={!rule.attribute}
              buttonClassName="mx-1"
            >
              <InlineBadgePopoverMenu
                items={attributes.map((a) => ({
                  value: a.value,
                  text: a.text,
                }))}
                selectedValue={rule.attribute}
                onSelect={(value) =>
                  onUpdate({
                    ...rule,
                    attribute: value,
                    value: undefined,
                  })
                }
              />
            </InlineBadgePopover>
            {/* Select the attribute value */}
            {rule.attribute && (
              <>
                is at least
                <InlineBadgePopover
                  text={formatValue(
                    rule.value,
                    ATTRIBUTE_BY_VALUE[rule.attribute]?.type,
                  )}
                  invalid={!rule.value}
                  buttonClassName="mx-1"
                >
                  <InlineBadgePopoverAmountInput
                    type={ATTRIBUTE_BY_VALUE[rule.attribute]?.type || "number"}
                    value={rule.value || ""}
                    onChange={(e) =>
                      onUpdate({
                        ...rule,
                        value: Number((e.target as HTMLInputElement).value),
                      })
                    }
                  />
                </InlineBadgePopover>
              </>
            )}
          </span>
        </div>
        <button
          type="button"
          onClick={onRemove}
          className="rounded p-1 text-neutral-400 hover:bg-neutral-100 hover:text-neutral-600"
        >
          <X className="size-4" />
        </button>
      </div>
    </div>
  );
}

function GroupMoveTarget() {
  const { group, loading } = useGroup();

  return (
    <div className="flex items-center gap-2 rounded-lg border border-neutral-200 p-2.5 pr-3">
      <div className="flex size-7 items-center justify-center rounded-md bg-neutral-100">
        <UserArrowRight className="size-4 text-neutral-600" />
      </div>
      <span className="flex items-center gap-1 text-sm font-medium text-neutral-800">
        Move partner to
        <div className="flex h-5 items-center justify-center gap-2 rounded-md bg-neutral-100 px-1.5">
          {loading || !group ? (
            <span className="flex items-center gap-1">
              <div className="h-3 w-3 animate-pulse rounded-full bg-neutral-200" />
              <span className="h-4 w-16 animate-pulse rounded bg-neutral-200" />
            </span>
          ) : (
            <>
              <GroupColorCircle group={group} />
              <span className="text-content-default text-sm font-semibold">
                {group?.name}
              </span>
            </>
          )}
        </div>
      </span>
    </div>
  );
}

function NoGroupRule() {
  return (
    <div className="flex h-24 w-full flex-col items-center justify-center rounded-lg bg-neutral-50">
      <UserArrowRight className="size-4 text-neutral-600" />
      <p className="mt-2 text-sm font-normal text-neutral-500">
        No group move rules set
      </p>
    </div>
  );
}
