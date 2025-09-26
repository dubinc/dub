import { programApplicationFormShortTextFieldSchema, programApplicationFormShortTextFieldWithValueSchema } from "@/lib/zod/schemas/program-application-form";
import { cn } from "@dub/utils";
import { useFormContext } from "react-hook-form";
import { z } from "zod";
import { MaxCharacterCount } from "./max-character-count";
import { FormControl } from "./form-control";

type ShortTextFieldData = z.infer<typeof programApplicationFormShortTextFieldSchema>

export function ShortTextField({
  keyPath: keyPathProp,
  field,
  preview,
}: {
  keyPath?: string;
  field: ShortTextFieldData;
  preview?: boolean;
}) {
  const { register, getFieldState, watch } = useFormContext<any>();
  const keyPath = keyPathProp ? `${keyPathProp}.value` : "value";
  const value = watch(keyPath);
  const state = getFieldState(keyPath);
  const currentLength = value?.length || 0;
  const exceedsMaxLength = field.data.maxLength && currentLength > field.data.maxLength;
  const error = !!state.error || exceedsMaxLength;

  return (
    <FormControl
      label={field.label}
      required={field.required}
    >
      <input
        className={cn(
          "mt-2 block w-full rounded-md focus:outline-none text-sm",
          error
            ? "border-red-400 pr-10 text-red-900 placeholder-red-300 focus:border-red-500 focus:ring-red-500"
            : "border-neutral-300 text-neutral-900 placeholder-neutral-400 focus:border-[var(--brand)] focus:ring-[var(--brand)]",
        )}
        placeholder={field.data.placeholder || ""}
        {...(preview ? {} : register(keyPath, {
          required: field.required,
        }))}
      />

      {field.data.maxLength && (
        <MaxCharacterCount currentLength={currentLength} maxLength={field.data.maxLength} />
      )}
    </FormControl >
  );
}
