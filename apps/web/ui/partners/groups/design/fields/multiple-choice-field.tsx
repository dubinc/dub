import { programApplicationFormMultipleChoiceFieldSchema } from "@/lib/zod/schemas/program-application-form";
import { z } from "zod";
import { FormControl } from "./form-control";
import { cn } from "@dub/utils";
import { useFormContext } from "react-hook-form";
import { RadioGroup, RadioGroupItem, Checkbox } from "@dub/ui";
import { useCallback } from "react";

type MultipleChoiceFieldData = z.infer<typeof programApplicationFormMultipleChoiceFieldSchema>

type MultipleChoiceFieldProps = {
  field: MultipleChoiceFieldData;
  keyPath?: string;
  preview?: boolean;
}

export function MultipleChoiceField({ field, keyPath: keyPathProp, preview }: MultipleChoiceFieldProps) {
  const { getFieldState, watch, setValue } = useFormContext<any>();
  const keyPath = keyPathProp ? `${keyPathProp}.value` : "value";
  const state = getFieldState(keyPath);
  const value = watch(keyPath);
  const error = !!state.error

  const isOptionSelected = useCallback((optionValue: string) => {
    if (field.data.multiple) {
      return value?.includes(optionValue);
    }
    return value === optionValue;
  }, [field.data.multiple, value]);

  const selectOption = useCallback((optionValue: string) => {
    if (field.data.multiple) {
      setValue(keyPath, [...(value || []), optionValue]);
    } else {
      setValue(keyPath, optionValue);
    }
  }, [field.data.multiple, setValue, keyPath, value]);

  const deselectOption = useCallback((optionValue: string) => {
    if (field.data.multiple) {
      if (Array.isArray(value) && value.includes(optionValue)) {
        setValue(keyPath, value.filter((v) => v !== optionValue));
      }
    } else {
      if (value === optionValue) {
        setValue(keyPath, "");
      }
    }
  }, [field.data.multiple, value, setValue, keyPath]);

  let content: React.ReactNode;

  if (field.data.multiple) {
    content = (
      <div>
        <div className="space-y-2">
          {field.data.options.map((option) => {
            const isSelected = isOptionSelected(option.value);

            return (
              <label
                className="w-full flex items-center gap-2.5 text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
              >
                <Checkbox
                  id={option.id}
                  checked={isSelected}
                  className="border-border-default size-4 rounded data-[state=checked]:bg-black data-[state=indeterminate]:bg-black focus:border-[var(--brand)] focus:ring-[var(--brand)] focus-visible:border-[var(--brand)] focus-visible:ring-[var(--brand)]"
                  onCheckedChange={(checked) => {
                    if (checked) {
                      selectOption(option.value);
                    } else {
                      deselectOption(option.value);
                    }
                  }}
                />

                <span className="text-sm text-content-emphasis">
                  {option.value}
                </span>
              </label>
            );
          })}
        </div>

        <div className={cn(
          "transition-colors duration-75 text-xs mt-2",
          error ? "text-red-500" : "text-neutral-500"
        )}>Select all that apply</div>
      </div>
    )
  } else {
    content = (
      <div>
        <RadioGroup
          value={typeof value === "string" ? value : ""}
          onValueChange={(newValue) => setValue(keyPath, newValue)}
          className="space-y-2"
        >
          {field.data.options.map((option) => (
            <label className="flex items-center gap-2.5 leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
              <RadioGroupItem value={option.value} id={option.id} className="focus:border-[var(--brand)] focus:ring-[var(--brand)]" />

              <span className="text-sm text-content-emphasis">
                {option.value}
              </span>
            </label>
          ))}
        </RadioGroup>

        {error && (
          <div className="text-red-500 text-xs mt-2">Select an option</div>
        )}
      </div>
    )
  }

  return (
    <FormControl
      label={field.label}
      required={field.required}
    >
      {content}
    </FormControl>
  );
}
