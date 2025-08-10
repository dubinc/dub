"use server";

import { unbanPartner } from "@/lib/api/partners/unban-partner";
import { getDefaultProgramIdOrThrow } from "@/lib/api/programs/get-default-program-id-or-throw";
import { getProgramEnrollmentOrThrow } from "@/lib/api/programs/get-program-enrollment-or-throw";
import { banPartnerSchema } from "@/lib/zod/schemas/partners";
import { authActionClient } from "../safe-action";

const unbanPartnerSchema = banPartnerSchema.omit({
  reason: true,
});

// Unban a partner
export const unbanPartnerAction = authActionClient
  .schema(unbanPartnerSchema)
  .action(async ({ parsedInput, ctx }) => {
    const { workspace, user } = ctx;
    const { partnerId } = parsedInput;

    const programId = getDefaultProgramIdOrThrow(workspace);

    const programEnrollment = await getProgramEnrollmentOrThrow({
      partnerId,
      programId,
      includePartner: true,
    });

    if (programEnrollment.status !== "banned") {
      throw new Error("This partner is not banned.");
    }

    await unbanPartner({
      workspace,
      program: programEnrollment.program,
      partner: programEnrollment.partner,
      user,
    });
  });
