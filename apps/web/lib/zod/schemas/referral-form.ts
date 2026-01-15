import * as z from "zod/v4";

export const fieldCommonSchema = z.object({
  key: z.string().min(1),
  label: z.string().min(1),
  required: z.boolean(),
  locked: z.boolean(),
  position: z.number().int().nonnegative(),
});

export const selectOptionSchema = z.object({
  label: z.string().min(1),
  value: z.string().min(1),
});

// Text
export const textFieldSchema = fieldCommonSchema.extend({
  type: z.literal("text"),
  constraints: z
    .object({
      maxLength: z.number().int().positive().optional(),
      pattern: z.string().optional(),
    })
    .optional(),
});

// Textarea
export const textareaFieldSchema = fieldCommonSchema.extend({
  type: z.literal("textarea"),
  constraints: z
    .object({
      maxLength: z.number().int().positive().optional(),
    })
    .optional(),
});

// Select
export const selectFieldSchema = fieldCommonSchema.extend({
  type: z.literal("select"),
  options: z.array(selectOptionSchema).min(2),
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
  options: z.array(selectOptionSchema).min(2),
});

// Number
export const numberFieldSchema = fieldCommonSchema.extend({
  type: z.literal("number"),
});

// Phone Number
export const phoneFieldSchema = fieldCommonSchema.extend({
  type: z.literal("phone"),
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
]);

export const formFieldsSchema = z
  .array(formFieldSchema)
  .min(1)
  .superRefine((fields, ctx) => {
    const keys = new Set<string>();
    const positions = new Set<number>();

    for (const field of fields) {
      if (keys.has(field.key)) {
        ctx.addIssue({
          path: ["fields"],
          message: `Duplicate field key: ${field.key}`,
          code: z.ZodIssueCode.custom,
        });
      }

      if (positions.has(field.position)) {
        ctx.addIssue({
          path: ["fields"],
          message: `Duplicate field position: ${field.position}`,
          code: z.ZodIssueCode.custom,
        });
      }

      keys.add(field.key);
      positions.add(field.position);
    }
  });

// Full form schema (builder storage)
export const referralFormSchema = z.object({
  fields: formFieldsSchema,
});

// This is the schema for the submitted form data that is stored in the database
export const referralFormDataSchema = z.object({
  key: z.string().min(1),
  label: z.string().min(1),
  value: z.unknown(),
});

// Schema for validating required fields
export const referralRequiredFieldsSchema = z.object({
  name: z.string().min(1, "Name is required"),
  email: z.email("Invalid email address"),
  company: z.string().min(1, "Company is required"),
});
