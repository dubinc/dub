import { formFieldSchema } from "@/lib/zod/schemas/submitted-lead-form";
import { nanoid } from "@dub/utils";
import * as z from "zod/v4";

type FormField = z.infer<typeof formFieldSchema>;

export type LeadFormFieldType = FormField["type"];

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

// Converts the fields and checks them with the form schema. On failure, it
// returns the first field with a problem.
export function parseLeadFormBuilderFields(
  fields: LeadFormBuilderField[],
):
  | { success: true; fields: FormField[] }
  | { success: false; key: string; message: string } {
  const parsedFields: FormField[] = [];

  for (const [position, field] of fields.entries()) {
    if (!field.type) {
      return {
        success: false,
        key: field.key,
        message: "Select an input type for each field.",
      };
    }

    const result = formFieldSchema.safeParse(
      fromLeadFormBuilderField({ ...field, type: field.type }, position),
    );

    if (!result.success) {
      const label = field.label.trim();
      const { message } = result.error.issues[0];

      return {
        success: false,
        key: field.key,
        message: label ? `${label}: ${message}` : message,
      };
    }

    parsedFields.push(result.data);
  }

  return { success: true, fields: parsedFields };
}
