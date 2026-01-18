"use client";

import {
  REFERRAL_FORM_FIELD_INPUT_PROPS,
  REFERRAL_FORM_REQUIRED_FIELDS,
} from "@/lib/referrals/constants";
import { referralFormSchema } from "@/lib/zod/schemas/referral-form";
import { useMemo } from "react";
import * as z from "zod/v4";
import { ReferralFormField } from "./form-fields";

export function ReferralForm({
  referralFormData,
}: {
  referralFormData: z.infer<typeof referralFormSchema>;
}) {
  // Combine required fields with custom fields and sort by position
  const allFields = useMemo(() => {
    const customFields = referralFormData.fields || [];

    return [...REFERRAL_FORM_REQUIRED_FIELDS, ...customFields].sort(
      (a, b) => a.position - b.position,
    );
  }, [referralFormData.fields]);

  return (
    <div className="flex flex-col gap-5">
      {allFields.map((field) => {
        const keyPath = `formData.${field.key}`;
        const inputProps = REFERRAL_FORM_FIELD_INPUT_PROPS[field.key];

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
