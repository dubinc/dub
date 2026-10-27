import { multiSelectFieldSchema } from "@/lib/zod/schemas/submitted-lead-form";
import { Checkbox, RadioGroup, RadioGroupItem } from "@dub/ui";
import { Controller, useFormContext } from "react-hook-form";
import * as z from "zod/v4";
import { FormControl } from "./form-control";

type MultiSelectFieldData = z.infer<typeof multiSelectFieldSchema>;

export function MultiSelectField({
  keyPath: keyPathProp,
  field,
}: {
  keyPath?: string;
  field: MultiSelectFieldData;
}) {
  const { getFieldState, control, formState } = useFormContext<any>();
  const keyPath = keyPathProp || `formData.${field.key}`;
  const state = getFieldState(keyPath, formState);
  const options = field.options;
  // Older fields have no value and allow multiple selections
  const multiple = field.multiple ?? true;

  return (
    <FormControl
      label={field.label}
      required={field.required}
      error={state.error?.message}
      labelDir="auto"
    >
      <Controller
        control={control}
        name={keyPath}
        rules={{
          validate: (val: any) => {
            if (!field.required) {
              return true;
            }
            if (!multiple && !val) {
              return "Please select an option";
            }
            if (multiple && (!Array.isArray(val) || !val.length)) {
              return "Please select at least one option";
            }
            return true;
          },
        }}
        render={({ field: formField }) =>
          !multiple ? (
            <RadioGroup
              value={formField.value ?? ""}
              onValueChange={formField.onChange}
              className="mt-2 gap-2"
            >
              {options.map((option) => (
                <label
                  key={option.value}
                  className="flex w-full items-center gap-2.5 text-sm font-medium leading-none"
                  dir="auto"
                >
                  <RadioGroupItem
                    value={option.value}
                    className="size-4 border-neutral-300 text-black focus-visible:ring-[var(--brand)] data-[state=checked]:border-black"
                  />
                  <span className="text-content-emphasis text-sm">
                    {option.label}
                  </span>
                </label>
              ))}
            </RadioGroup>
          ) : (
            <div className="mt-2 space-y-2">
              {options.map((option) => {
                const isSelected = formField.value?.includes(option.value);

                return (
                  <label
                    key={option.value}
                    className="flex w-full items-center gap-2.5 text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                    dir="auto"
                  >
                    <Checkbox
                      checked={isSelected}
                      className="border-border-default size-4 rounded focus:border-[var(--brand)] focus:ring-[var(--brand)] focus-visible:border-[var(--brand)] focus-visible:ring-[var(--brand)] data-[state=checked]:bg-black data-[state=indeterminate]:bg-black"
                      onCheckedChange={(checked) => {
                        if (checked) {
                          formField.onChange([
                            ...(formField.value || []),
                            option.value,
                          ]);
                        } else {
                          if (
                            Array.isArray(formField.value) &&
                            formField.value.includes(option.value)
                          ) {
                            formField.onChange(
                              formField.value.filter((v) => v !== option.value),
                            );
                          }
                        }
                      }}
                    />

                    <span className="text-content-emphasis text-sm">
                      {option.label}
                    </span>
                  </label>
                );
              })}
            </div>
          )
        }
      />
    </FormControl>
  );
}
