import { ProgramApplicationFormDataWithValues } from "@/lib/types";
import {
  programApplicationFormFieldSchema,
  programApplicationFormImageUploadFieldWithValueSchema,
  programApplicationFormLongTextFieldWithValueSchema,
  programApplicationFormMultipleChoiceFieldSchema,
  programApplicationFormMultipleChoiceFieldWithValueSchema,
  programApplicationFormSelectFieldWithValueSchema,
  programApplicationFormShortTextFieldWithValueSchema,
  programApplicationFormWebsiteAndSocialsFieldWithValueSchema,
} from "@/lib/zod/schemas/program-application-form";
import * as z from "zod/v4";

export const formDataForApplicationFormData = (
  fields: z.infer<typeof programApplicationFormFieldSchema>[],
): ProgramApplicationFormDataWithValues => {
  return {
    fields: fields.map((field: any) => {
      switch (field.type) {
        case "short-text":
          return {
            ...field,
            value: "",
          } as z.infer<
            typeof programApplicationFormShortTextFieldWithValueSchema
          >;
        case "long-text":
          return {
            ...field,
            value: "",
          } as z.infer<
            typeof programApplicationFormLongTextFieldWithValueSchema
          >;
        case "select":
          return {
            ...field,
            value: "",
          } as z.infer<typeof programApplicationFormSelectFieldWithValueSchema>;
        case "multiple-choice":
          const multipleChoiceField = field as z.infer<
            typeof programApplicationFormMultipleChoiceFieldSchema
          >;
          return {
            ...field,
            value: multipleChoiceField.data.multiple ? [] : "",
          } as z.infer<
            typeof programApplicationFormMultipleChoiceFieldWithValueSchema
          >;
        case "image-upload":
          return {
            ...field,
            value: [],
          } as z.infer<
            typeof programApplicationFormImageUploadFieldWithValueSchema
          >;
        case "website-and-socials":
          return {
            ...field,
            data: field.data.map((data) => ({
              ...data,
              value: "",
            })),
          } as z.infer<
            typeof programApplicationFormWebsiteAndSocialsFieldWithValueSchema
          >;
        default:
          return field;
      }
    }),
  } as any;
};
