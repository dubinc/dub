import { programApplicationFormMultipleChoiceFieldSchema, programApplicationFormMultipleChoiceFieldWithValueSchema } from "@/lib/zod/schemas/program-application-form";
import { z } from "zod";
import { FormControl } from "./form-control";
import { cn } from "@dub/utils";
import { useForm, useFormContext } from "react-hook-form";
import { RadioGroup, RadioGroupItem, Checkbox } from "@dub/ui";

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

  const isOptionSelected = (optionValue: string) => {
    if (field.data.multiple) {
      return value?.includes(optionValue);
    }
    return value === optionValue;
  }

  const selectOption = (optionValue: string) => {
    if (field.data.multiple) {
      setValue(keyPath, [...(value || []), optionValue]);
    } else {
      setValue(keyPath, optionValue);
    }
  }

  const deselectOption = (optionValue: string) => {
    if (field.data.multiple) {
      if (Array.isArray(value) && value.includes(optionValue)) {
        setValue(keyPath, value.filter((v) => v !== optionValue));
      }
    } else {
      if (value === optionValue) {
        setValue(keyPath, "");
      }
    }
  }

  let content: React.ReactNode;

  if (field.data.multiple) {
    content = (
      <div>
        <div className="space-y-2">
          {field.data.options.map((option) => {
            const isSelected = isOptionSelected(option.value);

            return (
              <div key={option.value} className="flex items-center space-x-2">
                <Checkbox
                  id={option.id}
                  checked={isSelected}
                  onCheckedChange={(checked) => {
                    if (checked) {
                      selectOption(option.value);
                    } else {
                      deselectOption(option.value);
                    }
                  }}
                />
                <label
                  htmlFor={option.id}
                  className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                >
                  {option.value}
                </label>
              </div>
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
      <RadioGroup
        value={typeof value === "string" ? value : ""}
        onValueChange={(newValue) => setValue(keyPath, newValue)}
        className="space-y-2"
      >
        <div>
          <div className="space-y-2">

            {field.data.options.map((option) => (
              <div key={option.value} className="flex items-center space-x-2">
                <RadioGroupItem value={option.value} id={option.id} />
                <label
                  htmlFor={option.id}
                  className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                >
                  {option.value}
                </label>
              </div>
            ))}
          </div>

          {error && (
            <div className="text-red-500 text-xs mt-2">Select an option</div>
          )}
        </div>
      </RadioGroup>
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
