import { programApplicationFormSelectFieldSchema } from "@/lib/zod/schemas/program-application-form";
import { Combobox } from "@dub/ui";
import { cn } from "@dub/utils";
import { Controller, useFormContext } from "react-hook-form";
import { z } from "zod";
import { FormControl } from "./form-control";

type SelectFieldData = z.infer<typeof programApplicationFormSelectFieldSchema>;

export function SelectField({
  keyPath: keyPathProp,
  field,
  preview,
}: {
  keyPath?: string;
  field: SelectFieldData;
  preview?: boolean;
}) {
  const { getFieldState, control } = useFormContext<any>();
  const keyPath = keyPathProp ? `${keyPathProp}.value` : "value";
  const state = getFieldState(keyPath);
  const error = !!state.error;

  const options = field.data.options.map((option) => ({
    label: option.value,
    value: option.value,
  }));

  return (
    <FormControl
      label={field.label}
      required={field.required}
      error={state.error?.message}
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
        render={({ field }) => (
          <Combobox
            selected={options.find((o) => o.value === field.value) ?? null}
            setSelected={(option) => {
              if (!option) return;
              field.onChange(option.value);
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
                !field.value && "text-neutral-400",
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
