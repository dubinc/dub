"use server";

import { trackActivityLog } from "@/lib/api/activity-log/track-activity-log";
import { createId } from "@/lib/api/create-id";
import { DubApiError } from "@/lib/api/errors";
import { getProgramEnrollmentOrThrow } from "@/lib/api/programs/get-program-enrollment-or-throw";
import { SUBMITTED_LEAD_FORM_REQUIRED_FIELD_KEYS } from "@/lib/submitted-leads/constants";
import { notifyPartnerLeadSubmitted } from "@/lib/submitted-leads/notify-partner-lead-submitted";
import { SubmittedLeadFormDataField } from "@/lib/types";
import {
  formFieldSchema,
  submittedLeadFormSchema,
  submittedLeadRequiredFieldsSchema,
} from "@/lib/zod/schemas/submitted-lead-form";
import { submitLeadSchema } from "@/lib/zod/schemas/submitted-leads";
import { prisma } from "@dub/prisma";
import { Prisma } from "@dub/prisma/client";
import { COUNTRIES } from "@dub/utils";
import { waitUntil } from "@vercel/functions";
import * as z from "zod/v4";
import { authPartnerActionClient } from "../actions/safe-action";

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

// Submit a lead
export const submitLeadAction = authPartnerActionClient
  .inputSchema(submitLeadSchema)
  .action(async ({ parsedInput, ctx }) => {
    const { partner, user } = ctx;
    const { programId, formData: rawFormData } = parsedInput;

    const programEnrollment = await getProgramEnrollmentOrThrow({
      partnerId: partner.id,
      programId,
      include: {
        program: true,
        partner: true,
      },
    });

    // Make sure required fields are present
    const requiredFieldsResult =
      submittedLeadRequiredFieldsSchema.safeParse(rawFormData);

    if (!requiredFieldsResult.success) {
      const firstError = requiredFieldsResult.error.issues[0];
      throw new DubApiError({
        code: "bad_request",
        message: firstError.message,
      });
    }

    const { name, email, company } = requiredFieldsResult.data;

    // Parse custom fields from formData
    const customFormData: SubmittedLeadFormDataField[] = [];

    // Parse and get form schema fields to extract labels
    const parsedLeadFormData = programEnrollment.program.referralFormData
      ? submittedLeadFormSchema.safeParse(
          programEnrollment.program.referralFormData,
        )
      : null;
    const formSchemaFields =
      parsedLeadFormData?.success && parsedLeadFormData.data.fields
        ? parsedLeadFormData.data.fields
        : [];

    const fieldMap = new Map<string, z.infer<typeof formFieldSchema>>();
    for (const field of formSchemaFields) {
      fieldMap.set(field.key, field);
    }

    // Process all fields in rawFormData except required ones
    for (const [key, value] of Object.entries(rawFormData)) {
      // Skip required fields
      if (SUBMITTED_LEAD_FORM_REQUIRED_FIELD_KEYS.has(key)) {
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
        type: fieldSchema?.type ?? "text",
      });
    }

    const submittedLead = await prisma.submittedLead.create({
      data: {
        id: createId({ prefix: "sbl_" }),
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
      Promise.allSettled([
        notifyPartnerLeadSubmitted({
          lead: submittedLead,
          program: programEnrollment.program,
          partner: programEnrollment.partner,
        }),

        trackActivityLog({
          workspaceId: programEnrollment.program.workspaceId,
          programId,
          resourceType: "submittedLead",
          resourceId: submittedLead.id,
          userId: user.id,
          action: "submittedLead.created",
        }),
      ]),
    );
  });
