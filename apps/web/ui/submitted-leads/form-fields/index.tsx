import { formFieldSchema } from "@/lib/zod/schemas/submitted-lead-form";
import * as z from "zod/v4";
import { CountryField } from "./country-field";
import { DateField } from "./date-field";
import { MultiSelectField } from "./multi-select-field";
import { NumberField } from "./number-field";
import { SelectField } from "./select-field";
import { TextField } from "./text-field";
import { TextareaField } from "./textarea-field";
import { UrlField } from "./url-field";

const FIELD_COMPONENTS: Record<
  Exclude<z.infer<typeof formFieldSchema>["type"], "text" | "phone">,
  React.ComponentType<any>
> = {
  textarea: TextareaField,
  select: SelectField,
  country: CountryField,
  date: DateField,
  multiSelect: MultiSelectField,
  number: NumberField,
  url: UrlField,
};

interface LeadFormFieldProps {
  field: z.infer<typeof formFieldSchema>;
  keyPath?: string;
  inputProps?: React.InputHTMLAttributes<HTMLInputElement>;
}

export const LeadFormField = ({
  field,
  keyPath,
  inputProps,
}: LeadFormFieldProps) => {
  // Handle text fields specially to pass inputProps. Phone fields from older
  // forms show as text fields, because the builder no longer offers them.
  if (field.type === "text" || field.type === "phone") {
    return (
      <TextField
        field={{ ...field, type: "text" }}
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
