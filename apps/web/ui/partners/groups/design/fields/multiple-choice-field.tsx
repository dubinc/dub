import { programApplicationFormMultipleChoiceFieldSchema } from "@/lib/zod/schemas/program-application-form";
import { Checkbox, RadioGroup, RadioGroupItem } from "@dub/ui";
import { Controller, useFormContext } from "react-hook-form";
import { z } from "zod";
import { FormControl } from "./form-control";

type MultipleChoiceFieldData = z.infer<
  typeof programApplicationFormMultipleChoiceFieldSchema
>;

type MultipleChoiceFieldProps = {
  field: MultipleChoiceFieldData;
  keyPath?: string;
  preview?: boolean;
};

export function MultipleChoiceField({
  field,
  keyPath: keyPathProp,
  preview,
}: MultipleChoiceFieldProps) {
  const { getFieldState, watch, setValue, control } = useFormContext<any>();
  const keyPath = keyPathProp ? `${keyPathProp}.value` : "value";
  const state = getFieldState(keyPath);
  const value = watch(keyPath);
  const options = field.data.options;

  let content: React.ReactNode;

  if (field.data.multiple) {
    content = (
      <Controller
        control={control}
        name={keyPath}
        rules={{
          validate: (val: any) => {
            if ((field.required && !Array.isArray(val)) || !val.length) {
              return "Select all that apply";
            }
            return true;
          },
        }}
        render={({ field }) => (
          <div className="space-y-2">
            {options.map((option) => {
              const isSelected = value?.includes(option.value);

              return (
                <label
                  key={option.id}
                  className="flex w-full items-center gap-2.5 text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                >
                  <Checkbox
                    id={option.id}
                    checked={isSelected}
                    className="border-border-default size-4 rounded focus:border-[var(--brand)] focus:ring-[var(--brand)] focus-visible:border-[var(--brand)] focus-visible:ring-[var(--brand)] data-[state=checked]:bg-black data-[state=indeterminate]:bg-black"
                    onCheckedChange={(checked) => {
                      if (checked) {
                        setValue(keyPath, [...(value || []), option.value]);
                      } else {
                        if (
                          Array.isArray(value) &&
                          value.includes(option.value)
                        ) {
                          setValue(
                            keyPath,
                            value.filter((v) => v !== option.value),
                          );
                        }
                      }
                    }}
                  />

                  <span className="text-content-emphasis text-sm">
                    {option.value}
                  </span>
                </label>
              );
            })}
          </div>
        )}
      />
    );
  } else {
    content = (
      <Controller
        control={control}
        name={keyPath}
        rules={{
          validate: (val: any) => {
            if (field.required && (!val || val === "")) {
              return "Please select an option";
            }
            return true;
          },
        }}
        render={({ field }) => (
          <RadioGroup
            value={typeof value === "string" ? value : ""}
            onValueChange={(newValue) => setValue(keyPath, newValue)}
            className="space-y-2"
          >
            {options.map((option) => (
              <label
                key={option.id}
                className="flex items-center gap-2.5 leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
              >
                <RadioGroupItem
                  value={option.value}
                  id={option.id}
                  className="focus:border-[var(--brand)] focus:ring-[var(--brand)]"
                />

                <span className="text-content-emphasis text-sm">
                  {option.value}
                </span>
              </label>
            ))}
          </RadioGroup>
        )}
      />
    );
  }

  return (
    <FormControl
      label={field.label}
      required={field.required}
      helperText={field.data.multiple ? "Select all that apply" : undefined}
      error={state.error?.message}
    >
      {content}
    </FormControl>
  );
}
