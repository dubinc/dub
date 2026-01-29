"use server";

import { createId } from "@/lib/api/create-id";
import { DubApiError } from "@/lib/api/errors";
import { getProgramEnrollmentOrThrow } from "@/lib/api/programs/get-program-enrollment-or-throw";
import { REFERRAL_FORM_REQUIRED_FIELD_KEYS } from "@/lib/referrals/constants";
import {
  formFieldSchema,
  referralFormSchema,
  referralRequiredFieldsSchema,
} from "@/lib/zod/schemas/referral-form";
import { createPartnerReferralSchema } from "@/lib/zod/schemas/referrals";
import { notifyPartnerReferralSubmitted } from "@/lib/api/referrals/notify-partner-referral-submitted";
import { prisma } from "@dub/prisma";
import { Prisma } from "@dub/prisma/client";
import { COUNTRIES } from "@dub/utils";
import { waitUntil } from "@vercel/functions";
import * as z from "zod/v4";
import { authPartnerActionClient } from "../safe-action";

/**
 * Converts field values based on field type:
 * - country: converts country code to country name
 * - select: converts option value to option label
 * - multiSelect: converts array of option values to array of option labels
 */
function convertFieldValue(
  value: unknown,
  fieldSchema?: z.infer<typeof formFieldSchema>,
): unknown {
  if (!fieldSchema) return value;

  switch (fieldSchema.type) {
    case "country":
      return typeof value === "string" && value in COUNTRIES
        ? COUNTRIES[value]
        : value;

    case "select": {
      const option = fieldSchema.options.find((opt) => opt.value === value);
      return option?.label ?? value;
    }

    case "multiSelect":
      return Array.isArray(value)
        ? value.map(
            (val) =>
              fieldSchema.options.find((opt) => opt.value === val)?.label ??
              val,
          )
        : value;

    default:
      return value;
  }
}

// Create a partner referral
export const submitReferralAction = authPartnerActionClient
  .inputSchema(createPartnerReferralSchema)
  .action(async ({ parsedInput, ctx }) => {
    const { partner } = ctx;
    const { programId, formData: rawFormData } = parsedInput;

    const programEnrollment = await getProgramEnrollmentOrThrow({
      partnerId: partner.id,
      programId,
      include: {
        program: true,
      },
    });

    // Make sure required fields are present
    const requiredFieldsResult =
      referralRequiredFieldsSchema.safeParse(rawFormData);

    if (!requiredFieldsResult.success) {
      const firstError = requiredFieldsResult.error.issues[0];
      throw new DubApiError({
        code: "bad_request",
        message: firstError.message,
      });
    }

    const { name, email, company } = requiredFieldsResult.data;

    // Parse custom fields from formData
    const customFormData: Array<{
      key: string;
      value: unknown;
      label: string;
    }> = [];

    // Parse and get form schema fields to extract labels
    const parsedReferralFormData = programEnrollment.program.referralFormData
      ? referralFormSchema.safeParse(programEnrollment.program.referralFormData)
      : null;
    const formSchemaFields =
      parsedReferralFormData?.success && parsedReferralFormData.data.fields
        ? parsedReferralFormData.data.fields
        : [];

    const fieldMap = new Map<string, z.infer<typeof formFieldSchema>>();
    for (const field of formSchemaFields) {
      fieldMap.set(field.key, field);
    }

    // Process all fields in rawFormData except required ones
    for (const [key, value] of Object.entries(rawFormData)) {
      // Skip required fields
      if (REFERRAL_FORM_REQUIRED_FIELD_KEYS.has(key)) {
        continue;
      }

      // Skip undefined/null/empty string/NaN so null values are never recorded (allow 0 and false)
      if (value === undefined || value === null || value === "") {
        continue;
      }
      if (typeof value === "number" && Number.isNaN(value)) {
        continue;
      }

      // Get field schema to extract label and handle value conversion
      const fieldSchema = fieldMap.get(key);
      const label = fieldSchema?.label || key;

      customFormData.push({
        key,
        label,
        value: convertFieldValue(value, fieldSchema),
      });
    }

    const referral = await prisma.partnerReferral.create({
      data: {
        id: createId({ prefix: "ref_" }),
        programId,
        partnerId: partner.id,
        name,
        email,
        company,
        formData:
          customFormData.length > 0
            ? (customFormData as Prisma.InputJsonValue)
            : undefined,
      },
    });

    waitUntil(
      notifyPartnerReferralSubmitted({
        referral,
        programId,
      }),
    );
  });
