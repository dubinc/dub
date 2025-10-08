import { z } from "zod";

// Common schema for all fields
export const programApplicationFormFieldCommonSchema = z.object({
  id: z.string(),
  label: z.string(),
  required: z.boolean(),
});

// Short text field
export const programApplicationFormShortTextFieldSchema =
  programApplicationFormFieldCommonSchema.extend({
    type: z.literal("short-text"),
    data: z.object({
      placeholder: z.string().optional(),
      maxLength: z.number().optional(),
    }),
  });

export const programApplicationFormShortTextFieldWithValueSchema = programApplicationFormShortTextFieldSchema.extend({
  value: z.string(),
});

// Long text field
export const programApplicationFormLongTextFieldSchema =
  programApplicationFormFieldCommonSchema.extend({
    type: z.literal("long-text"),
    data: z.object({
      placeholder: z.string().optional(),
      maxLength: z.number().optional(),
    }),
  });

export const programApplicationFormLongTextFieldWithValueSchema = programApplicationFormLongTextFieldSchema.extend({
  value: z.string(),
});

// Select field
export const programApplicationFormSelectOptionSchema = z.object({
  id: z.string(),
  value: z.string(),
});

export const programApplicationFormSelectFieldSchema =
  programApplicationFormFieldCommonSchema.extend({
    type: z.literal("select"),
    data: z.object({
      options: z.array(programApplicationFormSelectOptionSchema),
    }),
  });

export const programApplicationFormMultipleChoiceOptionSchema = z.object({
  id: z.string(),
  value: z.string(),
});

export const programApplicationFormSelectFieldWithValueSchema = programApplicationFormSelectFieldSchema.extend({
  value: z.string(),
});

// Multiple-choice field
export const programApplicationFormMultipleChoiceData = z.object({
  multiple: z.literal(true),
  options: z.array(programApplicationFormMultipleChoiceOptionSchema),
})

export const programApplicationFormSingleChoiceData = z.object({
  multiple: z.literal(false),
  options: z.array(programApplicationFormMultipleChoiceOptionSchema),
})

export const programApplicationFormMultipleChoiceFieldSchema =
  programApplicationFormFieldCommonSchema.extend({
    type: z.literal("multiple-choice"),
    data: z.discriminatedUnion("multiple", [programApplicationFormMultipleChoiceData, programApplicationFormSingleChoiceData]),
  });

export const programApplicationFormMultipleChoiceFieldWithValueSchema = programApplicationFormMultipleChoiceFieldSchema.extend({
  value: z.union([z.array(z.string()), z.string()]),
});

// Website and socials field
export const programApplicationFormSiteSchema = z.object({
  type: z.enum([
    "website",
    "youtube",
    "twitter",
    "linkedin",
    "instagram",
    "tiktok",
  ]),
  required: z.boolean(),
});

export const programApplicationFormSiteSchemaWithValue = programApplicationFormSiteSchema.extend({
  value: z.string(),
});

export const programApplicationFormWebsiteAndSocialsFieldSchema =
  z.object({
    id: z.string(),
    type: z.literal("website-and-socials"),
    data: z.array(programApplicationFormSiteSchema),
  });

export const programApplicationFormWebsiteAndSocialsFieldWithValueSchema = programApplicationFormWebsiteAndSocialsFieldSchema.extend({
  id: z.string(),
  type: z.literal("website-and-socials"),
  data: z.array(programApplicationFormSiteSchemaWithValue),
});

// All fields
export const programApplicationFormFieldSchema = z.discriminatedUnion("type", [
  programApplicationFormShortTextFieldSchema,
  programApplicationFormLongTextFieldSchema,
  programApplicationFormSelectFieldSchema,
  programApplicationFormMultipleChoiceFieldSchema,
  programApplicationFormWebsiteAndSocialsFieldSchema,
]);

export const programApplicationFormFieldWithValuesSchema = z.discriminatedUnion("type", [
  programApplicationFormShortTextFieldWithValueSchema,
  programApplicationFormLongTextFieldWithValueSchema,
  programApplicationFormSelectFieldWithValueSchema,
  programApplicationFormMultipleChoiceFieldWithValueSchema,
  programApplicationFormWebsiteAndSocialsFieldWithValueSchema,
]);

export const programApplicationFormFieldsSchema = z.array(programApplicationFormFieldSchema);

export const programApplicationFormFieldsWithValuesSchema = z.array(programApplicationFormFieldWithValuesSchema);

// Full form schema
export const programApplicationFormSchema = z.object({
  label: z.string().optional(),
  title: z.string().optional(),
  description: z.string().optional(),
  fields: programApplicationFormFieldsSchema,
});

export const programApplicationFormDataSchema = programApplicationFormSchema.extend({
  fields: programApplicationFormFieldsWithValuesSchema,
});

export const programApplicationFormDataWithValuesSchema = z.object({
  fields: programApplicationFormFieldsWithValuesSchema,
});