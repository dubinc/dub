import { formFieldSchema } from "@/lib/zod/schemas/referral-form";
import * as z from "zod/v4";
import { CountryField } from "./country-field";
import { DateField } from "./date-field";
import { MultiSelectField } from "./multi-select-field";
import { NumberField } from "./number-field";
import { PhoneField } from "./phone-field";
import { SelectField } from "./select-field";
import { TextField } from "./text-field";
import { TextareaField } from "./textarea-field";

const FIELD_COMPONENTS: Record<
  Exclude<z.infer<typeof formFieldSchema>["type"], "text">,
  React.ComponentType<any>
> = {
  textarea: TextareaField,
  select: SelectField,
  country: CountryField,
  date: DateField,
  multiSelect: MultiSelectField,
  number: NumberField,
  phone: PhoneField,
};

interface ReferralFormFieldProps {
  field: z.infer<typeof formFieldSchema>;
  keyPath?: string;
  inputProps?: React.InputHTMLAttributes<HTMLInputElement>;
}

export const ReferralFormField = ({
  field,
  keyPath,
  inputProps,
}: ReferralFormFieldProps) => {
  // Handle text fields specially to pass inputProps
  if (field.type === "text") {
    return (
      <TextField
        field={field}
        keyPath={keyPath}
        {...(inputProps && { inputProps })}
      />
    );
  }

  const Component = FIELD_COMPONENTS[field.type];

  if (!Component) {
    return null;
  }

  return <Component field={field} keyPath={keyPath} />;
};
