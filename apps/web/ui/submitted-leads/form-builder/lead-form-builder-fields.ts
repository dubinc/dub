import { formFieldSchema } from "@/lib/zod/schemas/submitted-lead-form";
import {
  CalendarIcon,
  CheckboxChecked,
  DropdownSelect,
  Globe,
  Hashtag,
  Icon,
  InputField,
  LinkChain,
  MobilePhone,
  TextArea,
} from "@dub/ui/icons";
import { nanoid } from "@dub/utils";
import * as z from "zod/v4";

type FormField = z.infer<typeof formFieldSchema>;

export type LeadFormFieldType = FormField["type"];

export const LEAD_FORM_FIELD_TYPES: Record<
  LeadFormFieldType,
  {
    label: string;
    icon: Icon;
    // Hidden types are only shown for existing fields that already use them
    hidden?: boolean;
  }
> = {
  text: { label: "Text field", icon: InputField },
  textarea: { label: "Text area", icon: TextArea },
  date: { label: "Date selection", icon: CalendarIcon },
  url: { label: "URL", icon: LinkChain },
  select: { label: "Dropdown", icon: DropdownSelect },
  country: { label: "Country", icon: Globe },
  multiSelect: { label: "Multiple choice", icon: CheckboxChecked },
  number: { label: "Number", icon: Hashtag },
  phone: { label: "Phone number", icon: MobilePhone, hidden: true },
};

export type LeadFormBuilderOption = {
  value: string;
  label: string;
};

export type LeadFormBuilderField = {
  key: string;
  type: LeadFormFieldType | null;
  label: string;
  required: boolean;
  options: LeadFormBuilderOption[];
  maxLength: number | null;
  min: number | null;
  max: number | null;
  pattern?: string;
};

export function createLeadFormBuilderField(): LeadFormBuilderField {
  return {
    key: nanoid(10),
    type: null,
    label: "",
    required: false,
    options: [],
    maxLength: null,
    min: null,
    max: null,
  };
}

export function createLeadFormBuilderOption(): LeadFormBuilderOption {
  return { value: nanoid(8), label: "" };
}

// Changing the type drops the settings of the old type and keeps only the label
export function changeLeadFormBuilderFieldType(
  field: LeadFormBuilderField,
  type: LeadFormFieldType,
): LeadFormBuilderField {
  return {
    ...createLeadFormBuilderField(),
    key: field.key,
    label: field.label,
    required: field.required,
    type,
    options:
      type === "select" || type === "multiSelect"
        ? [createLeadFormBuilderOption(), createLeadFormBuilderOption()]
        : [],
  };
}

export function toLeadFormBuilderField(field: FormField): LeadFormBuilderField {
  return {
    key: field.key,
    type: field.type,
    label: field.label,
    required: field.required,
    options:
      field.type === "select" || field.type === "multiSelect"
        ? field.options
        : [],
    maxLength:
      field.type === "text" || field.type === "textarea"
        ? field.constraints?.maxLength ?? null
        : null,
    min: field.type === "number" ? field.constraints?.min ?? null : null,
    max: field.type === "number" ? field.constraints?.max ?? null : null,
    pattern: field.type === "text" ? field.constraints?.pattern : undefined,
  };
}

export function fromLeadFormBuilderField(
  field: LeadFormBuilderField & { type: LeadFormFieldType },
  position: number,
): FormField {
  const common = {
    key: field.key,
    label: field.label.trim(),
    required: field.required,
    locked: false,
    position,
  };

  switch (field.type) {
    case "text":
      return {
        ...common,
        type: "text",
        ...((field.maxLength !== null || field.pattern) && {
          constraints: {
            ...(field.maxLength !== null && { maxLength: field.maxLength }),
            ...(field.pattern && { pattern: field.pattern }),
          },
        }),
      };
    case "textarea":
      return {
        ...common,
        type: "textarea",
        ...(field.maxLength !== null && {
          constraints: { maxLength: field.maxLength },
        }),
      };
    case "select":
    case "multiSelect":
      return {
        ...common,
        type: field.type,
        options: field.options.map(({ value, label }) => ({
          value,
          label: label.trim(),
        })),
      };
    case "number":
      return {
        ...common,
        type: "number",
        ...((field.min !== null || field.max !== null) && {
          constraints: {
            ...(field.min !== null && { min: field.min }),
            ...(field.max !== null && { max: field.max }),
          },
        }),
      };
    default:
      return { ...common, type: field.type };
  }
}

// Returns the first problem with the fields, or null when they are valid
export function validateLeadFormBuilderFields(
  fields: LeadFormBuilderField[],
): { key: string; message: string } | null {
  for (const field of fields) {
    if (!field.type) {
      return {
        key: field.key,
        message: "Select an input type for each field.",
      };
    }

    if (!field.label.trim()) {
      return { key: field.key, message: "Enter a label for each field." };
    }

    if (field.type === "select" || field.type === "multiSelect") {
      if (field.options.length < 2) {
        return {
          key: field.key,
          message: `"${field.label}" needs at least two options.`,
        };
      }

      if (field.options.some(({ label }) => !label.trim())) {
        return {
          key: field.key,
          message: `Enter a label for each option of "${field.label}".`,
        };
      }
    }

    if (
      field.maxLength !== null &&
      (!Number.isInteger(field.maxLength) || field.maxLength < 1)
    ) {
      return {
        key: field.key,
        message: `The max characters of "${field.label}" must be a whole number of at least 1.`,
      };
    }

    if (
      (field.min !== null && Number.isNaN(field.min)) ||
      (field.max !== null && Number.isNaN(field.max))
    ) {
      return {
        key: field.key,
        message: `Enter a number for the limits of "${field.label}".`,
      };
    }

    if (field.min !== null && field.max !== null && field.min > field.max) {
      return {
        key: field.key,
        message: `The minimum of "${field.label}" can't be more than its maximum.`,
      };
    }
  }

  return null;
}
