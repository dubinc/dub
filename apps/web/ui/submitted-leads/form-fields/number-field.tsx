import { numberFieldSchema } from "@/lib/zod/schemas/submitted-lead-form";
import { cn } from "@dub/utils";
import { useFormContext } from "react-hook-form";
import * as z from "zod/v4";
import {
  blockNonNumericKeys,
  FormControl,
  requiredFieldRule,
} from "./form-control";

type NumberFieldData = z.infer<typeof numberFieldSchema>;

export function NumberField({
  keyPath: keyPathProp,
  field,
}: {
  keyPath?: string;
  field: NumberFieldData;
}) {
  const { register, getFieldState, formState } = useFormContext<any>();
  const keyPath = keyPathProp || `formData.${field.key}`;
  const state = getFieldState(keyPath, formState);
  const error = !!state.error;
  const min = field.constraints?.min;
  const max = field.constraints?.max;

  return (
    <FormControl
      label={field.label}
      required={field.required}
      error={state.error?.message}
      labelDir="auto"
    >
      <input
        type="number"
        onKeyDown={blockNonNumericKeys}
        min={min}
        max={max}
        className={cn(
          "mt-2 block w-full rounded-md text-sm focus:outline-none",
          error
            ? "border-red-400 pr-10 text-red-900 placeholder-red-300 focus:border-red-500 focus:ring-red-500"
            : "border-neutral-300 text-neutral-900 placeholder-neutral-400 focus:border-[var(--brand)] focus:ring-[var(--brand)]",
        )}
        {...register(keyPath, {
          required: requiredFieldRule(field.required),
          valueAsNumber: true,
          ...(min !== undefined && {
            min: {
              value: min,
              message: `Please enter a number of at least ${min}`,
            },
          }),
          ...(max !== undefined && {
            max: {
              value: max,
              message: `Please enter a number of at most ${max}`,
            },
          }),
        })}
      />
    </FormControl>
  );
}
