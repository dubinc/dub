"use server";

import { trackActivityLog } from "@/lib/api/activity-log/track-activity-log";
import { createId } from "@/lib/api/create-id";
import { DubApiError } from "@/lib/api/errors";
import { prisma } from "@/lib/prisma";
import { SUBMITTED_LEAD_FORM_REQUIRED_FIELD_KEYS } from "@/lib/submitted-leads/constants";
import { getGroupSubmittedLeadForm } from "@/lib/submitted-leads/get-group-submitted-lead-form";
import { notifyPartnerLeadSubmitted } from "@/lib/submitted-leads/notify-partner-lead-submitted";
import { SubmittedLeadFormDataField } from "@/lib/types";
import { assertRateLimit } from "@/lib/upstash/assert-rate-limit";
import { RATELIMIT_POLICIES } from "@/lib/upstash/ratelimit-policies";
import {
  formFieldSchema,
  submittedLeadRequiredFieldsSchema,
} from "@/lib/zod/schemas/submitted-lead-form";
import { submitLeadSchema } from "@/lib/zod/schemas/submitted-leads";
import { COUNTRIES } from "@dub/utils";
import { Prisma } from "@prisma/client";
import { waitUntil } from "@vercel/functions";
import * as z from "zod/v4";
import { authPartnerActionClient } from "../actions/safe-action";
import { ACTIVE_ENROLLMENT_STATUSES } from "../zod/schemas/partners";

/**
 * Converts field values based on field type:
 * - country: converts country code to country name
 * - select: converts option value to option label
 * - multiSelect: converts array of option values to array of option labels,
 *   or a single option value to its label when multiple selections are off
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

    case "multiSelect": {
      const toLabel = (val: unknown) =>
        fieldSchema.options.find((opt) => opt.value === val)?.label ?? val;

      return Array.isArray(value) ? value.map(toLabel) : toLabel(value);
    }

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

    await assertRateLimit({
      policy: RATELIMIT_POLICIES.submitLead,
      identifier: partner.id,
    });

    const programEnrollment = await prisma.programEnrollment.findUnique({
      where: {
        partnerId_programId: {
          partnerId: partner.id,
          programId,
        },
        status: {
          in: ACTIVE_ENROLLMENT_STATUSES,
        },
      },
      include: {
        program: true,
        partner: true,
        partnerGroup: true,
      },
    });

    if (!programEnrollment) {
      throw new DubApiError({
        code: "not_found",
        message: "Partner is not eligible to submit leads in this program.",
      });
    }

    const leadForm = getGroupSubmittedLeadForm(programEnrollment.partnerGroup);

    if (!leadForm) {
      throw new DubApiError({
        code: "forbidden",
        message: "This program does not accept submitted leads.",
      });
    }

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

    const fieldMap = new Map<string, z.infer<typeof formFieldSchema>>();
    for (const field of leadForm.fields) {
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

      if (!fieldSchema) continue;

      if (fieldSchema.type === "number") {
        const { min, max } = fieldSchema.constraints ?? {};

        if (
          (min !== undefined && !(typeof value === "number" && value >= min)) ||
          (max !== undefined && !(typeof value === "number" && value <= max))
        ) {
          const range =
            min !== undefined && max !== undefined
              ? `between ${min} and ${max}`
              : min !== undefined
                ? `at least ${min}`
                : `at most ${max}`;

          throw new DubApiError({
            code: "bad_request",
            message: `${fieldSchema.label} must be ${range}.`,
          });
        }
      }

      customFormData.push({
        key,
        label: fieldSchema.label || key,
        value: convertFieldValue(value, fieldSchema),
        type: fieldSchema.type,
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
