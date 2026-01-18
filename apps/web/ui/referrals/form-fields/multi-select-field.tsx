import { multiSelectFieldSchema } from "@/lib/zod/schemas/referral-form";
import { Checkbox } from "@dub/ui";
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
  const { getFieldState, control } = useFormContext<any>();
  const keyPath = keyPathProp || `formData.${field.key}`;
  const state = getFieldState(keyPath);
  const options = field.options;

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
            if (field.required && (!Array.isArray(val) || !val.length)) {
              return "Please select at least one option";
            }
            return true;
          },
        }}
        render={({ field: formField }) => (
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
        )}
      />
    </FormControl>
  );
}
