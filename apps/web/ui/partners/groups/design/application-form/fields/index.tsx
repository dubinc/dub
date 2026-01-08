import { programApplicationFormFieldSchema } from "@/lib/zod/schemas/program-application-form";
import * as z from "zod/v4";
import { LongTextField } from "./long-text-field";
import { MultipleChoiceField } from "./multiple-choice-field";
import { SelectField } from "./select-field";
import { ShortTextField } from "./short-text-field";
import { WebsiteAndSocialsField } from "./website-and-socials-field";

const FIELD_COMPONENTS: Record<
  z.infer<typeof programApplicationFormFieldSchema>["type"],
  any
> = {
  "multiple-choice": MultipleChoiceField,
  "short-text": ShortTextField,
  "long-text": LongTextField,
  select: SelectField,
  "website-and-socials": WebsiteAndSocialsField,
};

export const ProgramApplicationFormField = ({
  field,
  keyPath,
  preview,
}: {
  field: z.infer<typeof programApplicationFormFieldSchema>;
  keyPath?: string;
  preview?: boolean;
}) => {
  const Component = FIELD_COMPONENTS[field.type];

  if (!Component) {
    return null;
  }

  return <Component field={field} keyPath={keyPath} preview={preview} />;
};
