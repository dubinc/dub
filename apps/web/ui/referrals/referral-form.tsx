"use client";

import {
  referralFormSchema,
  textFieldSchema,
} from "@/lib/zod/schemas/referral-form";
import { useMemo } from "react";
import * as z from "zod/v4";
import { ReferralFormField } from "./form-fields";

// Required fields configuration
const REQUIRED_FIELDS: z.infer<typeof textFieldSchema>[] = [
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

// Input props map for required fields
const FIELD_INPUT_PROPS: Record<
  string,
  React.InputHTMLAttributes<HTMLInputElement>
> = {
  email: { type: "email", autoComplete: "email" },
  name: { autoComplete: "name" },
  company: { autoComplete: "organization" },
};

export function ReferralForm({
  referralFormData,
}: {
  referralFormData: z.infer<typeof referralFormSchema>;
}) {
  // Combine required fields with custom fields and sort by position
  const allFields = useMemo(() => {
    const customFields = referralFormData.fields || [];

    return [...REQUIRED_FIELDS, ...customFields].sort(
      (a, b) => a.position - b.position,
    );
  }, [referralFormData.fields]);

  return (
    <div className="flex flex-col gap-6">
      {allFields.map((field) => {
        const keyPath = `formData.${field.key}`;
        const inputProps = FIELD_INPUT_PROPS[field.key];

        return (
          <ReferralFormField
            key={field.key}
            field={field}
            keyPath={keyPath}
            {...(inputProps && { inputProps })}
          />
        );
      })}
    </div>
  );
}
