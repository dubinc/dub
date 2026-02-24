import { selectFieldSchema } from "@/lib/zod/schemas/referral-form";
import { Combobox } from "@dub/ui";
import { cn } from "@dub/utils";
import { Controller, useFormContext } from "react-hook-form";
import * as z from "zod/v4";
import { FormControl } from "./form-control";

type SelectFieldData = z.infer<typeof selectFieldSchema>;

export function SelectField({
  keyPath: keyPathProp,
  field,
}: {
  keyPath?: string;
  field: SelectFieldData;
}) {
  const { getFieldState, control } = useFormContext<any>();
  const keyPath = keyPathProp || `formData.${field.key}`;
  const state = getFieldState(keyPath);
  const error = !!state.error;

  const options = field.options.map((option) => ({
    label: option.label,
    value: option.value,
  }));

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
            if (field.required && (!val || val === "")) {
              return "Please select an option";
            }
            return true;
          },
        }}
        render={({ field: formField }) => (
          <Combobox
            selected={options.find((o) => o.value === formField.value) ?? null}
            setSelected={(option) => {
              if (!option) return;
              formField.onChange(option.value);
            }}
            options={options}
            caret={true}
            placeholder="Select"
            matchTriggerWidth
            buttonProps={{
              className: cn(
                "mt-1.5 w-full justify-start border-neutral-300 px-3",
                "data-[state=open]:ring-1 data-[state=open]:ring-neutral-500 data-[state=open]:border-neutral-500",
                "focus:ring-1 focus:ring-neutral-500 focus:border-neutral-500 focus:border-[var(--brand)] focus:ring-[var(--brand)] transition-none",
                !formField.value && "text-neutral-400",
                error && "border-red-500 ring-red-500 ring-1",
              ),
            }}
            hideSearch
          />
        )}
      />
    </FormControl>
  );
}
