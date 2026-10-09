import { urlFieldSchema } from "@/lib/zod/schemas/submitted-lead-form";
import { cn, isValidUrl } from "@dub/utils";
import { useFormContext } from "react-hook-form";
import * as z from "zod/v4";
import { FormControl, requiredFieldRule } from "./form-control";

type UrlFieldData = z.infer<typeof urlFieldSchema>;

export function UrlField({
  keyPath: keyPathProp,
  field,
}: {
  keyPath?: string;
  field: UrlFieldData;
}) {
  const { register, getFieldState, formState } = useFormContext<any>();
  const keyPath = keyPathProp || `formData.${field.key}`;
  const state = getFieldState(keyPath, formState);
  const error = !!state.error;

  return (
    <FormControl
      label={field.label}
      required={field.required}
      error={state.error?.message}
      labelDir="auto"
    >
      <input
        type="url"
        placeholder="https://"
        className={cn(
          "mt-2 block w-full rounded-md text-sm focus:outline-none",
          error
            ? "border-red-400 pr-10 text-red-900 placeholder-red-300 focus:border-red-500 focus:ring-red-500"
            : "border-neutral-300 text-neutral-900 placeholder-neutral-400 focus:border-[var(--brand)] focus:ring-[var(--brand)]",
        )}
        {...register(keyPath, {
          required: requiredFieldRule(field.required),
          validate: (value: string) => {
            if (!value) return true;
            return isValidUrl(value) || "Please enter a valid URL";
          },
        })}
      />
    </FormControl>
  );
}
