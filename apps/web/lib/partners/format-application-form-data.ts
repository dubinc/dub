import { ProgramApplicationFormDataWithValues } from "@/lib/types";
import { ProgramApplication } from "@prisma/client";

export const formatApplicationFormData = (
  application: ProgramApplication,
): { title: string; value: string }[] => {
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
    .filter((v) => !!v) as { title: string; value: string }[];
};
