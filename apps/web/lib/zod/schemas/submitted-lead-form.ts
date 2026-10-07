import * as z from "zod/v4";

const fieldTypeSchema = z.enum([
  "text",
  "textarea",
  "select",
  "country",
  "date",
  "multiSelect",
  "number",
  "phone",
  "url",
]);

export const fieldCommonSchema = z.object({
  key: z.string().min(1),
  label: z.string().min(1, "Enter a label for each field."),
  required: z.boolean(),
  locked: z.boolean(),
  position: z.number().int().nonnegative(),
});

export const selectOptionSchema = z.object({
  label: z.string().min(1, "Enter a label for each option."),
  value: z.string().min(1),
});

const selectOptionsSchema = z
  .array(selectOptionSchema)
  .min(2, "Add at least two options.");

const maxLengthSchema = z
  .number({ error: "Enter a number for the max characters." })
  .int("The max characters must be a whole number.")
  .min(1, "The max characters must be at least 1.");

const numberLimitSchema = z.number({
  error: "Enter a number for the minimum and maximum.",
});

// Text
export const textFieldSchema = fieldCommonSchema.extend({
  type: z.literal("text"),
  constraints: z
    .object({
      maxLength: maxLengthSchema.optional(),
      pattern: z.string().optional(),
    })
    .optional(),
});

// Textarea
export const textareaFieldSchema = fieldCommonSchema.extend({
  type: z.literal("textarea"),
  constraints: z
    .object({
      maxLength: maxLengthSchema.optional(),
    })
    .optional(),
});

// Select
export const selectFieldSchema = fieldCommonSchema.extend({
  type: z.literal("select"),
  options: selectOptionsSchema,
});

// Country
export const countryFieldSchema = fieldCommonSchema.extend({
  type: z.literal("country"),
});

// Date
export const dateFieldSchema = fieldCommonSchema.extend({
  type: z.literal("date"),
});

// Multiple Choices (Multi-select)
export const multiSelectFieldSchema = fieldCommonSchema.extend({
  type: z.literal("multiSelect"),
  options: selectOptionsSchema,
  // Older fields have no value and allow multiple selections
  multiple: z.boolean().optional(),
});

// Number
export const numberFieldSchema = fieldCommonSchema.extend({
  type: z.literal("number"),
  constraints: z
    .object({
      min: numberLimitSchema.optional(),
      max: numberLimitSchema.optional(),
    })
    .refine(
      ({ min, max }) => min === undefined || max === undefined || min <= max,
      { message: "The minimum can't be more than the maximum." },
    )
    .optional(),
});

// Phone Number
export const phoneFieldSchema = fieldCommonSchema.extend({
  type: z.literal("phone"),
});

// URL
export const urlFieldSchema = fieldCommonSchema.extend({
  type: z.literal("url"),
});

export const formFieldSchema = z.discriminatedUnion("type", [
  textFieldSchema,
  textareaFieldSchema,
  selectFieldSchema,
  countryFieldSchema,
  dateFieldSchema,
  multiSelectFieldSchema,
  numberFieldSchema,
  phoneFieldSchema,
  urlFieldSchema,
]);

export const formFieldsSchema = z
  .array(formFieldSchema)
  .superRefine((fields, ctx) => {
    const keys = new Set<string>();
    const positions = new Set<number>();

    for (const field of fields) {
      if (keys.has(field.key)) {
        ctx.addIssue({
          path: ["fields"],
          message: `Duplicate field key: ${field.key}`,
          code: "custom",
        });
      }

      if (positions.has(field.position)) {
        ctx.addIssue({
          path: ["fields"],
          message: `Duplicate field position: ${field.position}`,
          code: "custom",
        });
      }

      keys.add(field.key);
      positions.add(field.position);
    }
  });

// Full form schema (builder storage)
export const submittedLeadFormSchema = z.object({
  fields: formFieldsSchema,
});

// This is the schema for the submitted form data that is stored in the database
export const submittedLeadFormDataSchema = z.object({
  key: z.string().min(1),
  label: z.string().min(1),
  value: z.unknown(),
  type: fieldTypeSchema.default("text"),
});

// Schema for validating required fields
export const submittedLeadRequiredFieldsSchema = z.object({
  name: z.string().min(1, "Name is required"),
  email: z.email("Invalid email address"),
  company: z.string().min(1, "Company is required"),
});
