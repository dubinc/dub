import { dateFieldSchema } from "@/lib/zod/schemas/referral-form";
import { cn } from "@dub/utils";
import { useFormContext } from "react-hook-form";
import * as z from "zod/v4";
import { FormControl } from "./form-control";

type DateFieldData = z.infer<typeof dateFieldSchema>;

export function DateField({
  keyPath: keyPathProp,
  field,
}: {
  keyPath?: string;
  field: DateFieldData;
}) {
  const { register, getFieldState } = useFormContext<any>();
  const keyPath = keyPathProp || `formData.${field.key}`;
  const state = getFieldState(keyPath);
  const error = !!state.error;

  return (
    <FormControl
      label={field.label}
      required={field.required}
      error={state.error?.message}
      labelDir="auto"
    >
      <input
        type="date"
        className={cn(
          "mt-2 block w-full rounded-md text-sm focus:outline-none",
          error
            ? "border-red-400 pr-10 text-red-900 placeholder-red-300 focus:border-red-500 focus:ring-red-500"
            : "border-neutral-300 text-neutral-900 placeholder-neutral-400 focus:border-[var(--brand)] focus:ring-[var(--brand)]",
        )}
        {...register(keyPath, {
          required: field.required,
        })}
      />
    </FormControl>
  );
}
