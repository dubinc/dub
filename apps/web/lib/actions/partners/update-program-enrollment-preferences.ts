"use server";

import { getProgramEnrollmentOrThrow } from "@/lib/api/programs/get-program-enrollment-or-throw";
import { prisma } from "@/lib/prisma";
import { programEnrollmentPreferencesValueSchemas } from "@/lib/zod/schemas/programs";
import { Prisma } from "@prisma/client";
import * as z from "zod/v4";
import { authPartnerActionClient } from "../safe-action";

const schema = z.object({
  programId: z.string(),
  key: z.string(),
  value: z.any(),
});

// Update preferences for a partner's program enrollment
export const updateProgramEnrollmentPreferences = authPartnerActionClient
  .inputSchema(schema)
  .action(async ({ ctx, parsedInput }) => {
    const { partner } = ctx;
    const { programId, key, value } = parsedInput;

    const valueSchema =
      programEnrollmentPreferencesValueSchemas[
        key as keyof typeof programEnrollmentPreferencesValueSchemas
      ];

    if (!valueSchema) {
      throw new Error(`Invalid program enrollment preference key: ${key}`);
    }

    const parsedValue = valueSchema.parse(value);

    const programEnrollment = await getProgramEnrollmentOrThrow({
      partnerId: partner.id,
      programId,
      include: {},
    });

    const partnerPreferences =
      (programEnrollment.partnerPreferences as Record<
        string,
        unknown
      > | null) ?? {};

    await prisma.programEnrollment.update({
      where: {
        id: programEnrollment.id,
      },
      data: {
        partnerPreferences: {
          ...partnerPreferences,
          [key]: parsedValue,
        } as Prisma.InputJsonValue,
      },
    });

    return { ok: true };
  });
