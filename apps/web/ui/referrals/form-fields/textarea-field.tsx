import { textareaFieldSchema } from "@/lib/zod/schemas/referral-form";
import { cn } from "@dub/utils";
import { useFormContext } from "react-hook-form";
import * as z from "zod/v4";
import { FormControl } from "./form-control";
import { MaxCharacterCount } from "./max-character-count";

type TextareaFieldData = z.infer<typeof textareaFieldSchema>;

export function TextareaField({
  keyPath: keyPathProp,
  field,
}: {
  keyPath?: string;
  field: TextareaFieldData;
}) {
  const { register, getFieldState, watch } = useFormContext<any>();
  const keyPath = keyPathProp || `formData.${field.key}`;
  const value = watch(keyPath);
  const state = getFieldState(keyPath);
  const currentLength = value?.length || 0;
  const maxLength = field.constraints?.maxLength;
  const exceedsMaxLength = maxLength && currentLength > maxLength;
  const error = !!state.error || exceedsMaxLength;

  return (
    <FormControl label={field.label} required={field.required} dir="auto">
      <textarea
        className={cn(
          "mt-2 block w-full rounded-md text-sm focus:outline-none",
          error
            ? "border-red-400 pr-10 text-red-900 placeholder-red-300 focus:border-red-500 focus:ring-red-500"
            : "border-neutral-300 text-neutral-900 placeholder-neutral-400 focus:border-[var(--brand)] focus:ring-[var(--brand)]",
        )}
        rows={4}
        {...register(keyPath, {
          required: field.required,
          maxLength: maxLength,
        })}
      />

      {maxLength && (
        <MaxCharacterCount
          currentLength={currentLength}
          maxLength={maxLength}
        />
      )}
    </FormControl>
  );
}
