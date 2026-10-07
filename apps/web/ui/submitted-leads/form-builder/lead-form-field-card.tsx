"use client";

import { blockNonNumericKeys } from "@/ui/submitted-leads/form-fields/form-control";
import { Button, Combobox, Switch } from "@dub/ui";
import { GripDotsVertical, Plus, Trash } from "@dub/ui/icons";
import { cn } from "@dub/utils";
import {
  AnimatePresence,
  motion,
  Reorder,
  useDragControls,
} from "motion/react";
import { forwardRef, PointerEvent, ReactNode } from "react";
import {
  changeLeadFormBuilderFieldType,
  createLeadFormBuilderOption,
  LeadFormBuilderField,
  LeadFormBuilderOption,
  LeadFormFieldType,
} from "./lead-form-builder-fields";
import { LEAD_FORM_FIELD_TYPES } from "./lead-form-field-types";

// Prevent the default action so the browser doesn't select text while dragging
function startDrag(
  e: PointerEvent<HTMLDivElement>,
  controls: ReturnType<typeof useDragControls>,
) {
  e.preventDefault();
  controls.start(e);
}

const inputClassName =
  "block h-10 w-full rounded-lg border-neutral-200 px-3 text-sm text-neutral-800 placeholder-neutral-400 focus:border-neutral-500 focus:outline-none focus:ring-neutral-500";

// Forwards its ref so AnimatePresence can take a removed card out of the flow
export const LeadFormFieldCard = forwardRef<
  HTMLLIElement,
  {
    field: LeadFormBuilderField;
    expanded: boolean;
    error?: boolean;
    onToggle: () => void;
    onChange: (field: LeadFormBuilderField) => void;
    onRemove: () => void;
  }
>(function LeadFormFieldCard(
  { field, expanded, error, onToggle, onChange, onRemove },
  ref,
) {
  const controls = useDragControls();
  const TypeIcon = field.type
    ? LEAD_FORM_FIELD_TYPES[field.type].icon
    : GripDotsVertical;

  return (
    <Reorder.Item
      ref={ref}
      value={field.key}
      dragListener={false}
      dragControls={controls}
      // Animate only the position. A size animation scales the content.
      layout="position"
      className={cn(
        "group/field overflow-hidden rounded-[10px] border border-neutral-200 bg-white",
        error && "border-red-500",
      )}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.15 }}
    >
      <div
        className={cn(
          "flex items-center justify-between gap-2 p-2",
          expanded && "border-b border-neutral-200",
        )}
      >
        <div className="flex min-w-0 flex-1 items-center gap-2">
          <div
            onPointerDown={(e) => startDrag(e, controls)}
            className="flex size-6 shrink-0 cursor-grab touch-none items-center justify-center rounded-md text-neutral-800 hover:bg-neutral-200/50"
            title="Drag to reorder"
          >
            <TypeIcon className="size-3.5 group-hover/field:hidden" />
            <GripDotsVertical className="hidden size-3.5 group-hover/field:block" />
          </div>
          <button
            type="button"
            onClick={onToggle}
            className="min-w-0 flex-1 truncate text-left text-sm font-semibold text-neutral-800"
          >
            {field.label.trim() || "Input"}
          </button>
        </div>
        <button
          type="button"
          onClick={onRemove}
          title="Remove field"
          className={cn(
            "flex size-6 shrink-0 items-center justify-center rounded text-neutral-500 transition-colors hover:bg-neutral-100 hover:text-neutral-800",
            !expanded &&
              "opacity-0 focus-visible:opacity-100 group-hover/field:opacity-100",
          )}
        >
          <Trash className="size-3.5" />
        </button>
      </div>

      <motion.div
        animate={{ height: expanded ? "auto" : 0 }}
        transition={{ duration: 0.15 }}
        initial={false}
        className="overflow-hidden"
      >
        <LeadFormFieldSettings field={field} onChange={onChange} />
      </motion.div>
    </Reorder.Item>
  );
});

function LeadFormFieldSettings({
  field,
  onChange,
}: {
  field: LeadFormBuilderField;
  onChange: (field: LeadFormBuilderField) => void;
}) {
  const typeOptions = (
    Object.entries(LEAD_FORM_FIELD_TYPES) as [
      LeadFormFieldType,
      (typeof LEAD_FORM_FIELD_TYPES)[LeadFormFieldType],
    ][]
  ).map(([type, { label, icon }]) => ({ value: type, label, icon }));

  return (
    <div className="flex flex-col gap-5 p-4">
      <div className="flex flex-col gap-2">
        <span className="text-sm font-medium text-neutral-900">Input type</span>
        <Combobox
          selected={
            typeOptions.find(({ value }) => value === field.type) ?? null
          }
          setSelected={(option) => {
            if (!option || option.value === field.type) return;
            onChange(
              changeLeadFormBuilderFieldType(
                field,
                option.value as LeadFormFieldType,
              ),
            );
          }}
          options={typeOptions}
          placeholder="Select"
          caret
          hideSearch
          matchTriggerWidth
          buttonProps={{
            className: cn(
              "h-10 w-full justify-start rounded-lg border-neutral-200 px-3",
              !field.type && "text-neutral-400",
            ),
          }}
        />
      </div>

      {field.type && (
        <>
          <label className="flex flex-col gap-2">
            <span className="text-sm font-medium text-neutral-900">
              Field label
            </span>
            <input
              type="text"
              value={field.label}
              onChange={(e) => onChange({ ...field, label: e.target.value })}
              placeholder={LEAD_FORM_FIELD_TYPES[field.type].label}
              maxLength={190}
              className={inputClassName}
            />
          </label>

          {(field.type === "select" || field.type === "multiSelect") && (
            <LeadFormFieldOptions
              options={field.options}
              onChange={(options) => onChange({ ...field, options })}
            />
          )}

          <div className="flex flex-col gap-3">
            <SettingSwitch
              label="Required"
              checked={field.required}
              onChange={(required) => onChange({ ...field, required })}
            />

            {(field.type === "text" || field.type === "textarea") && (
              <OptionalNumberSetting
                label="Max characters"
                value={field.maxLength}
                min={1}
                defaultValue={field.type === "text" ? 100 : 500}
                onChange={(maxLength) => onChange({ ...field, maxLength })}
              />
            )}

            {field.type === "number" && (
              <>
                <OptionalNumberSetting
                  label="Minimum number"
                  value={field.min}
                  defaultValue={0}
                  onChange={(min) => onChange({ ...field, min })}
                />
                <OptionalNumberSetting
                  label="Maximum number"
                  value={field.max}
                  defaultValue={100}
                  onChange={(max) => onChange({ ...field, max })}
                />
              </>
            )}
          </div>
        </>
      )}
    </div>
  );
}

function LeadFormFieldOptions({
  options,
  onChange,
}: {
  options: LeadFormBuilderOption[];
  onChange: (options: LeadFormBuilderOption[]) => void;
}) {
  return (
    <div className="flex flex-col gap-2">
      <span className="text-sm font-medium text-neutral-900">Options</span>
      <Reorder.Group
        axis="y"
        values={options.map(({ value }) => value)}
        onReorder={(values) =>
          onChange(
            values.map(
              (value) => options.find((option) => option.value === value)!,
            ),
          )
        }
        className="flex flex-col gap-2"
      >
        <AnimatePresence initial={false} mode="popLayout">
          {options.map((option, index) => (
            <LeadFormFieldOption
              key={option.value}
              option={option}
              onChange={(label) =>
                onChange(
                  options.map((o, i) => (i === index ? { ...o, label } : o)),
                )
              }
              onRemove={() => onChange(options.filter((_, i) => i !== index))}
            />
          ))}
        </AnimatePresence>
      </Reorder.Group>
      <Button
        type="button"
        variant="secondary"
        text="Add option"
        icon={<Plus className="size-4" />}
        className="h-9 rounded-lg"
        onClick={() => onChange([...options, createLeadFormBuilderOption()])}
      />
    </div>
  );
}

const LeadFormFieldOption = forwardRef<
  HTMLLIElement,
  {
    option: LeadFormBuilderOption;
    onChange: (label: string) => void;
    onRemove: () => void;
  }
>(function LeadFormFieldOption({ option, onChange, onRemove }, ref) {
  const controls = useDragControls();

  return (
    <Reorder.Item
      ref={ref}
      value={option.value}
      layout="position"
      dragListener={false}
      dragControls={controls}
      className="group/option flex h-10 items-center gap-2 rounded-lg border border-neutral-200 bg-white pl-2 pr-1 focus-within:border-neutral-500"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.15 }}
    >
      <div
        onPointerDown={(e) => startDrag(e, controls)}
        className="flex size-6 shrink-0 cursor-grab touch-none items-center justify-center rounded-lg text-neutral-800 hover:bg-neutral-200/50"
        title="Drag to reorder"
      >
        <GripDotsVertical className="size-3.5" />
      </div>
      <input
        type="text"
        value={option.label}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Option"
        maxLength={190}
        className="min-w-0 flex-1 border-none p-0 text-sm text-neutral-800 placeholder-neutral-400 focus:outline-none focus:ring-0"
      />
      <button
        type="button"
        onClick={onRemove}
        title="Remove option"
        className="flex size-6 shrink-0 items-center justify-center rounded text-neutral-500 opacity-0 transition-colors hover:bg-neutral-100 hover:text-neutral-800 focus-visible:opacity-100 group-hover/option:opacity-100"
      >
        <Trash className="size-3.5" />
      </button>
    </Reorder.Item>
  );
});

function SettingSwitch({
  label,
  checked,
  onChange,
}: {
  label: ReactNode;
  checked: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-between gap-4">
      <span className="text-sm font-medium text-neutral-800">{label}</span>
      <Switch checked={checked} fn={onChange} />
    </div>
  );
}

// A switch that shows a number input when it is on
function OptionalNumberSetting({
  label,
  value,
  min,
  defaultValue,
  onChange,
}: {
  label: string;
  value: number | null;
  min?: number;
  defaultValue: number;
  onChange: (value: number | null) => void;
}) {
  return (
    <div className="flex flex-col gap-2">
      <SettingSwitch
        label={label}
        checked={value !== null}
        onChange={(checked) => onChange(checked ? defaultValue : null)}
      />
      {value !== null && (
        <input
          type="number"
          onKeyDown={blockNonNumericKeys}
          value={Number.isNaN(value) ? "" : value}
          min={min}
          onChange={(e) => onChange(e.target.valueAsNumber)}
          className={inputClassName}
          aria-label={label}
        />
      )}
    </div>
  );
}
