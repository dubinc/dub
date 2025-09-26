import { Combobox } from "@dub/ui";
import { programApplicationFormSelectFieldSchema, programApplicationFormSelectFieldWithValueSchema } from "@/lib/zod/schemas/program-application-form";
import { z } from "zod";
import { FormControl } from "./form-control";
import { useFormContext } from "react-hook-form";
import { cn } from "@dub/utils";

type SelectFieldData = z.infer<typeof programApplicationFormSelectFieldSchema>

export function SelectField({
  keyPath: keyPathProp,
  field,
  preview,
}: {
  keyPath?: string;
  field: SelectFieldData;
  preview?: boolean;
}) {
  const { watch, getFieldState, setValue } = useFormContext<any>();
  const keyPath = keyPathProp ? `${keyPathProp}.value` : "value";
  const state = getFieldState(keyPath);
  const error = !!state.error
  const value = watch(keyPath);

  const options = field.data.options.map((option) => ({
    label: option.value,
    value: option.value,
  }))

  return (
    <FormControl
      label={field.label}
      required={field.required}
    >
      <Combobox
        selected={options.find((o) => o.value === value) ?? null}
        setSelected={(option) => {
          if (!option) return;
          setValue(keyPath, option.value);
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
            !value && "text-neutral-400",
            error && "border-red-500 ring-red-500 ring-1",
          ),
        }}
        hideSearch
      />
    </FormControl>
  );
}
