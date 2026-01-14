import * as z from "zod/v4";

// Common schema for all custom fields (not including the 3 required fields: name, email, company)
export const referralFormFieldCommonSchema = z.object({
  id: z.string(),
  label: z.string(),
  required: z.boolean(),
});

// Short text field
export const referralFormShortTextFieldSchema =
  referralFormFieldCommonSchema.extend({
    type: z.literal("short-text"),
    data: z.object({
      placeholder: z.string().optional(),
      maxLength: z.number().optional(),
    }),
  });

export const referralFormShortTextFieldWithValueSchema =
  referralFormShortTextFieldSchema.extend({
    value: z.string(),
  });

// Long text field
export const referralFormLongTextFieldSchema =
  referralFormFieldCommonSchema.extend({
    type: z.literal("long-text"),
    data: z.object({
      placeholder: z.string().optional(),
      maxLength: z.number().optional(),
    }),
  });

export const referralFormLongTextFieldWithValueSchema =
  referralFormLongTextFieldSchema.extend({
    value: z.string(),
  });

// Select field
export const referralFormSelectOptionSchema = z.object({
  id: z.string(),
  value: z.string(),
});

export const referralFormSelectFieldSchema =
  referralFormFieldCommonSchema.extend({
    type: z.literal("select"),
    data: z.object({
      options: z.array(referralFormSelectOptionSchema),
    }),
  });

export const referralFormSelectFieldWithValueSchema =
  referralFormSelectFieldSchema.extend({
    value: z.string(),
  });

// Multiple-choice field
export const referralFormMultipleChoiceOptionSchema = z.object({
  id: z.string(),
  value: z.string(),
});

export const referralFormMultipleChoiceData = z.object({
  multiple: z.literal(true),
  options: z.array(referralFormMultipleChoiceOptionSchema),
});

export const referralFormSingleChoiceData = z.object({
  multiple: z.literal(false),
  options: z.array(referralFormMultipleChoiceOptionSchema),
});

export const referralFormMultipleChoiceFieldSchema =
  referralFormFieldCommonSchema.extend({
    type: z.literal("multiple-choice"),
    data: z.discriminatedUnion("multiple", [
      referralFormMultipleChoiceData,
      referralFormSingleChoiceData,
    ]),
  });

export const referralFormMultipleChoiceFieldWithValueSchema =
  referralFormMultipleChoiceFieldSchema.extend({
    value: z.union([z.array(z.string()), z.string()]),
  });

// All custom field types
export const referralFormFieldSchema = z.discriminatedUnion("type", [
  referralFormShortTextFieldSchema,
  referralFormLongTextFieldSchema,
  referralFormSelectFieldSchema,
  referralFormMultipleChoiceFieldSchema,
]);

export const referralFormFieldWithValuesSchema = z.discriminatedUnion(
  "type",
  [
    referralFormShortTextFieldWithValueSchema,
    referralFormLongTextFieldWithValueSchema,
    referralFormSelectFieldWithValueSchema,
    referralFormMultipleChoiceFieldWithValueSchema,
  ],
);

export const referralFormFieldsSchema = z.array(referralFormFieldSchema);

export const referralFormFieldsWithValuesSchema = z.array(
  referralFormFieldWithValuesSchema,
);

// Full form schema (for configuration/storage)
export const referralFormSchema = z.object({
  title: z.string().optional(),
  description: z.string().optional(),
  fields: referralFormFieldsSchema,
});

// Form data schema (for submission with values)
export const referralFormDataSchema = z.object({
  fields: referralFormFieldsWithValuesSchema,
});

// Schema for the 3 required fields + custom form data
export const referralSubmissionSchema = z.object({
  name: z.string().trim().min(1).max(200),
  email: z.string().email().trim().min(1).max(200),
  company: z.string().trim().min(1).max(200),
  formData: referralFormDataSchema.optional(),
});
