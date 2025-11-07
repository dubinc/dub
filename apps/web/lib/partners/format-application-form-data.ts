import { ProgramApplicationFormDataWithValues } from "@/lib/types";
import { ProgramApplication } from "@prisma/client";

export interface FormDataKeyValue {
  title: string;
  value: string;
}

export const formatApplicationFormData = (
  application: ProgramApplication,
): FormDataKeyValue[] => {
  const formData =
    application?.formData as ProgramApplicationFormDataWithValues;

  return (formData?.fields ?? [])
    .map((field) => {
      switch (field.type) {
        case "short-text":
          return {
            title: field.label,
            value: field.value,
          };
        case "long-text":
          return {
            title: field.label,
            value: field.value,
          };
        case "select":
          return {
            title: field.label,
            value: field.value,
          };
        case "multiple-choice":
          let value;

          if (field.data.multiple) {
            value = Array.isArray(field.value)
              ? field.value.join(", ")
              : field.value;
          } else {
            value = field.value;
          }

          return {
            title: field.label,
            value,
          };
        case "website-and-socials":
          return null;
      }
    })
    .filter((v) => !!v) as FormDataKeyValue[];
};

export const formatWebsiteAndSocialsFields = (
  application: ProgramApplication,
) => {
  const formData =
    application?.formData as ProgramApplicationFormDataWithValues;

  const result: Record<string, string | null> = {};

  (formData?.fields ?? []).forEach((field) => {
    if (field.type === "website-and-socials") {
      field.data.forEach((item) => {
        result[item.type] = item.value !== "" ? item.value : null;
      });
    }
  });

  return result;
};
