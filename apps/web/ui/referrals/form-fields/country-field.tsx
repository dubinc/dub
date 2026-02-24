import { countryFieldSchema } from "@/lib/zod/schemas/referral-form";
import { CountryCombobox } from "@/ui/partners/country-combobox";
import { Controller, useFormContext } from "react-hook-form";
import * as z from "zod/v4";
import { FormControl } from "./form-control";

type CountryFieldData = z.infer<typeof countryFieldSchema>;

export function CountryField({
  keyPath: keyPathProp,
  field,
}: {
  keyPath?: string;
  field: CountryFieldData;
}) {
  const { getFieldState, control } = useFormContext<any>();
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
      <Controller
        control={control}
        name={keyPath}
        rules={{
          validate: (val: any) => {
            if (field.required && (!val || val === "")) {
              return "Please select a country";
            }
            return true;
          },
        }}
        render={({ field: formField }) => (
          <CountryCombobox
            value={formField.value || ""}
            onChange={formField.onChange}
            error={error}
            className="focus:border-[var(--brand)] focus:ring-[var(--brand)]"
          />
        )}
      />
    </FormControl>
  );
}
