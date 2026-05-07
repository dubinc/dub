"use client";

import {
  SUBMITTED_LEAD_FORM_FIELD_INPUT_PROPS,
  SUBMITTED_LEAD_FORM_REQUIRED_FIELDS,
} from "@/lib/submitted-leads/constants";
import { submittedLeadFormSchema } from "@/lib/zod/schemas/submitted-lead-form";
import { useMemo } from "react";
import * as z from "zod/v4";
import { LeadFormField } from "./form-fields";

export function LeadForm({
  leadFormData,
}: {
  leadFormData: z.infer<typeof submittedLeadFormSchema>;
}) {
  // Combine required fields with custom fields and sort by position
  const allFields = useMemo(() => {
    const customFields = leadFormData.fields || [];

    return [...SUBMITTED_LEAD_FORM_REQUIRED_FIELDS, ...customFields].sort(
      (a, b) => a.position - b.position,
    );
  }, [leadFormData.fields]);

  return (
    <div className="flex flex-col gap-5">
      {allFields.map((field) => {
        const keyPath = `formData.${field.key}`;
        const inputProps = SUBMITTED_LEAD_FORM_FIELD_INPUT_PROPS[field.key];

        return (
          <LeadFormField
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
