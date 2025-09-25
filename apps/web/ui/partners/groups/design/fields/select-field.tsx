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
  const { register, getFieldState } = useFormContext<any>();
  const keyPath = keyPathProp ? `${keyPathProp}.value` : "value";
  const state = getFieldState(keyPath);
  const error = !!state.error

  return (
    <FormControl
      label={field.label}
      required={field.required}
    >
      <select
        id={field.id}
        {...(preview ? {} : register(keyPath, {
          required: field.required,
        }))}
        className={cn(
          "mt-2 block w-full rounded-md focus:outline-none text-sm",
          error
            ? "border-red-400 pr-10 text-red-900 placeholder-red-300 focus:border-red-500 focus:ring-red-500"
            : "border-neutral-300 text-neutral-900 placeholder-neutral-400 focus:border-[var(--brand)] focus:ring-[var(--brand)]",
        )}
      >
        <option selected>
          Select
        </option>

        {field.data.options.map((option) => (
          <option key={option.id} value={option.value}>
            {option.value}
          </option>
        ))}
      </select>
    </FormControl>
  );
}
