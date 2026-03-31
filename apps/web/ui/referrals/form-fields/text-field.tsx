import { textFieldSchema } from "@/lib/zod/schemas/referral-form";
import { cn } from "@dub/utils";
import { useFormContext } from "react-hook-form";
import * as z from "zod/v4";
import { FormControl } from "./form-control";
import { MaxCharacterCount } from "./max-character-count";

type TextFieldData = z.infer<typeof textFieldSchema>;

export function TextField({
  keyPath: keyPathProp,
  field,
  inputProps,
}: {
  keyPath?: string;
  field: TextFieldData;
  inputProps?: React.InputHTMLAttributes<HTMLInputElement>;
}) {
  const { register, getFieldState, watch } = useFormContext<any>();
  const keyPath = keyPathProp || `formData.${field.key}`;
  const value = watch(keyPath);
  const state = getFieldState(keyPath);
  const currentLength = value?.length || 0;
  const maxLength = field.constraints?.maxLength;
  const exceedsMaxLength = maxLength && currentLength > maxLength;
  const error = !!state.error || exceedsMaxLength;

  // Determine input type - use email for email fields, text otherwise
  const inputType = inputProps?.type || "text";

  return (
    <FormControl label={field.label} required={field.required} dir="auto">
      <input
        type={inputType}
        className={cn(
          "mt-2 block w-full rounded-md text-sm focus:outline-none",
          error
            ? "border-red-400 pr-10 text-red-900 placeholder-red-300 focus:border-red-500 focus:ring-red-500"
            : "border-neutral-300 text-neutral-900 placeholder-neutral-400 focus:border-[var(--brand)] focus:ring-[var(--brand)]",
        )}
        {...inputProps}
        {...register(keyPath, {
          required: field.required,
          maxLength: maxLength,
          pattern: field.constraints?.pattern
            ? new RegExp(field.constraints.pattern)
            : undefined,
          ...(inputType === "email" && {
            validate: (value: string) => {
              if (!value) return true; // required check handles empty
              return (
                /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value) ||
                "Please enter a valid email address"
              );
            },
          }),
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
