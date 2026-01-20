import { textFieldSchema } from "@/lib/zod/schemas/referral-form";
import { ACME_PROGRAM_ID } from "@dub/utils";
import * as z from "zod/v4";

// Required fields configuration for referral forms
export const REFERRAL_FORM_REQUIRED_FIELDS: z.infer<typeof textFieldSchema>[] =
  [
    {
      key: "name",
      label: "Name",
      type: "text",
      required: true,
      locked: true,
      position: -3,
    },
    {
      key: "email",
      label: "Email",
      type: "text",
      required: true,
      locked: true,
      position: -2,
    },
    {
      key: "company",
      label: "Company",
      type: "text",
      required: true,
      locked: true,
      position: -1,
    },
  ];

// Set of required field keys for quick lookup (derived from REQUIRED_FIELDS)
export const REFERRAL_FORM_REQUIRED_FIELD_KEYS = new Set(
  REFERRAL_FORM_REQUIRED_FIELDS.map((field) => field.key),
);

// Input props map for required fields
export const REFERRAL_FORM_FIELD_INPUT_PROPS: Record<
  string,
  React.InputHTMLAttributes<HTMLInputElement>
> = {
  email: { type: "email", autoComplete: "email" },
  name: { autoComplete: "name" },
  company: { autoComplete: "organization" },
};

export const REFERRAL_ENABLED_PROGRAM_IDS = [
  ACME_PROGRAM_ID, // Acme
  "prog_1K7Y2RGFC4BKZQQZAZEEK9MVE", // SelectCode
];
